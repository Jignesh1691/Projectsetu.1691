/**
 * Sync Queue Manager
 * Handles offline data synchronization with the backend
 */

import { offlineDB, SyncQueueItem } from './db';

export interface SyncResult {
    success: boolean;
    syncedCount: number;
    failedCount: number;
    errors: Array<{ id: string; error: string }>;
}

export interface SyncOptions {
    maxRetries?: number;
    retryDelay?: number;
}

const DEFAULT_OPTIONS: Required<SyncOptions> = {
    maxRetries: 3,
    retryDelay: 1000, // 1 second base delay
};

class SyncManager {
    private syncing = false;
    private listeners: Array<(result: SyncResult) => void> = [];

    /**
     * Queue an API call for later sync
     */
    async queueRequest(
        endpoint: string,
        method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        data: any
    ): Promise<string> {
        try {
            const id = await offlineDB.addToSyncQueue({
                endpoint,
                method,
                data,
                status: 'pending',
            });

            console.log('[Sync] Request queued:', { id, endpoint, method });

            // Try to sync immediately if online
            if (navigator.onLine) {
                this.processQueue().catch(console.error);
            }

            return id;
        } catch (error) {
            console.error('[Sync] Failed to queue request:', error);
            throw error;
        }
    }

    /**
     * Process the sync queue
     */
    async processQueue(options: SyncOptions = {}): Promise<SyncResult> {
        if (this.syncing) {
            console.log('[Sync] Already syncing, skipping');
            return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
        }

        if (!navigator.onLine) {
            console.log('[Sync] Offline, skipping sync');
            return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
        }

        this.syncing = true;
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const result: SyncResult = {
            success: true,
            syncedCount: 0,
            failedCount: 0,
            errors: [],
        };

        try {
            const items = await offlineDB.getPendingSyncItems();
            console.log(`[Sync] Processing ${items.length} pending items`);

            for (const item of items) {
                // Skip if already retried too many times
                if (item.retryCount >= opts.maxRetries) {
                    console.warn(`[Sync] Item ${item.id} exceeded max retries`);
                    await offlineDB.updateSyncItem(item.id, {
                        status: 'failed',
                        error: 'Max retries exceeded',
                    });
                    result.failedCount++;
                    result.errors.push({ id: item.id, error: 'Max retries exceeded' });
                    continue;
                }

                // Mark as processing
                await offlineDB.updateSyncItem(item.id, { status: 'processing' });

                try {
                    await this.syncItem(item);
                    await offlineDB.removeSyncItem(item.id);
                    result.syncedCount++;
                    console.log(`[Sync] Successfully synced item ${item.id}`);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error(`[Sync] Failed to sync item ${item.id}:`, errorMessage);

                    // Exponential backoff delay
                    const delay = opts.retryDelay * Math.pow(2, item.retryCount);
                    await new Promise(resolve => setTimeout(resolve, delay));

                    await offlineDB.updateSyncItem(item.id, {
                        status: 'pending',
                        retryCount: item.retryCount + 1,
                        error: errorMessage,
                    });

                    result.failedCount++;
                    result.errors.push({ id: item.id, error: errorMessage });
                }
            }

            // Clean up old items
            await offlineDB.clearOldSyncItems();

            result.success = result.failedCount === 0;

        } catch (error) {
            console.error('[Sync] Queue processing error:', error);
            result.success = false;
        } finally {
            this.syncing = false;
            this.notifyListeners(result);
        }

        return result;
    }

    /**
     * Sync a single item
     */
    private async syncItem(item: SyncQueueItem): Promise<void> {
        const response = await fetch(item.endpoint, {
            method: item.method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.data),
            credentials: 'include',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return response.json();
    }

    /**
     * Check if currently syncing
     */
    isSyncing(): boolean {
        return this.syncing;
    }

    /**
     * Get pending sync count
     */
    async getPendingCount(): Promise<number> {
        const items = await offlineDB.getPendingSyncItems();
        return items.length;
    }

    /**
     * Add sync listener
     */
    onSync(callback: (result: SyncResult) => void): () => void {
        this.listeners.push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Notify all listeners
     */
    private notifyListeners(result: SyncResult): void {
        this.listeners.forEach(listener => {
            try {
                listener(result);
            } catch (error) {
                console.error('[Sync] Listener error:', error);
            }
        });
    }

    /**
     * Clear all sync data (for logout)
     */
    async clear(): Promise<void> {
        await offlineDB.clearAll();
    }
}

// Singleton instance
export const syncManager = new SyncManager();

// Auto-sync when online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('[Sync] Connection restored, processing queue');
        syncManager.processQueue().catch(console.error);
    });
}
