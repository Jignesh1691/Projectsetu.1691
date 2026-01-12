/**
 * IndexedDB Wrapper for Offline Storage
 * Provides type-safe storage for offline data and sync queue
 */

const DB_NAME = 'projectsetu-offline';
const DB_VERSION = 1;

export interface SyncQueueItem {
    id: string;
    timestamp: number;
    endpoint: string;
    method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    data: any;
    retryCount: number;
    status: 'pending' | 'processing' | 'failed';
    error?: string;
}

export interface OfflineDataItem {
    id: string;
    type: string; // 'transaction', 'hajari', 'material', etc.
    data: any;
    timestamp: number;
    synced: boolean;
}

export interface UserPreference {
    key: string;
    value: any;
    updatedAt: number;
}

class OfflineDB {
    private db: IDBDatabase | null = null;

    /**
     * Initialize the database
     */
    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create sync queue store
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncQueue = db.createObjectStore('syncQueue', { keyPath: 'id' });
                    syncQueue.createIndex('status', 'status', { unique: false });
                    syncQueue.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Create offline data store
                if (!db.objectStoreNames.contains('offlineData')) {
                    const offlineData = db.createObjectStore('offlineData', { keyPath: 'id' });
                    offlineData.createIndex('type', 'type', { unique: false });
                    offlineData.createIndex('synced', 'synced', { unique: false });
                    offlineData.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Create user preferences store
                if (!db.objectStoreNames.contains('userPreferences')) {
                    db.createObjectStore('userPreferences', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Ensure database is initialized
     */
    private async ensureDB(): Promise<IDBDatabase> {
        if (!this.db) {
            await this.init();
        }
        return this.db!;
    }

    // ==================== Sync Queue Operations ====================

    /**
     * Add item to sync queue
     */
    async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
        const db = await this.ensureDB();
        const id = crypto.randomUUID();
        const queueItem: SyncQueueItem = {
            ...item,
            id,
            timestamp: Date.now(),
            retryCount: 0,
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.add(queueItem);

            request.onsuccess = () => resolve(id);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all pending sync queue items
     */
    async getPendingSyncItems(): Promise<SyncQueueItem[]> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['syncQueue'], 'readonly');
            const store = transaction.objectStore('syncQueue');
            const index = store.index('status');
            const request = index.getAll('pending');

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update sync queue item status
     */
    async updateSyncItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (item) {
                    const updatedItem = { ...item, ...updates };
                    const putRequest = store.put(updatedItem);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    reject(new Error(`Sync item ${id} not found`));
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Remove item from sync queue
     */
    async removeSyncItem(id: string): Promise<void> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all synced items from queue (older than 24 hours)
     */
    async clearOldSyncItems(): Promise<void> {
        const db = await this.ensureDB();
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['syncQueue'], 'readwrite');
            const store = transaction.objectStore('syncQueue');
            const request = store.openCursor();

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const item = cursor.value as SyncQueueItem;
                    if (item.timestamp < cutoffTime && item.status !== 'pending') {
                        cursor.delete();
                    }
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    // ==================== Offline Data Operations ====================

    /**
     * Save offline data
     */
    async saveOfflineData(type: string, data: any): Promise<string> {
        const db = await this.ensureDB();
        const id = crypto.randomUUID();
        const item: OfflineDataItem = {
            id,
            type,
            data,
            timestamp: Date.now(),
            synced: false,
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['offlineData'], 'readwrite');
            const store = transaction.objectStore('offlineData');
            const request = store.add(item);

            request.onsuccess = () => resolve(id);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get offline data by type
     */
    async getOfflineDataByType(type: string): Promise<OfflineDataItem[]> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['offlineData'], 'readonly');
            const store = transaction.objectStore('offlineData');
            const index = store.index('type');
            const request = index.getAll(type);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Mark offline data as synced
     */
    async markAsSynced(id: string): Promise<void> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['offlineData'], 'readwrite');
            const store = transaction.objectStore('offlineData');
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (item) {
                    item.synced = true;
                    const putRequest = store.put(item);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve(); // Item doesn't exist, consider it synced
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Clear synced offline data
     */
    async clearSyncedData(): Promise<void> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['offlineData'], 'readwrite');
            const store = transaction.objectStore('offlineData');
            const index = store.index('synced');
            const request = index.openCursor(IDBKeyRange.only(true));

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    // ==================== User Preferences Operations ====================

    /**
     * Save user preference
     */
    async setPreference(key: string, value: any): Promise<void> {
        const db = await this.ensureDB();
        const preference: UserPreference = {
            key,
            value,
            updatedAt: Date.now(),
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['userPreferences'], 'readwrite');
            const store = transaction.objectStore('userPreferences');
            const request = store.put(preference);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get user preference
     */
    async getPreference<T = any>(key: string): Promise<T | null> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['userPreferences'], 'readonly');
            const store = transaction.objectStore('userPreferences');
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result as UserPreference | undefined;
                resolve(result ? result.value : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all data (for logout)
     */
    async clearAll(): Promise<void> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['syncQueue', 'offlineData', 'userPreferences'], 'readwrite');

            const promises = [
                transaction.objectStore('syncQueue').clear(),
                transaction.objectStore('offlineData').clear(),
                transaction.objectStore('userPreferences').clear(),
            ];

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Singleton instance
export const offlineDB = new OfflineDB();
