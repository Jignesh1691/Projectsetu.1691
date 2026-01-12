/**
 * Utility functions for offline mode
 */

/**
 * Check if the app is running in a browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Check if browser supports the required APIs
 */
export const supportsOfflineMode = (): boolean => {
    if (!isBrowser) return false;

    return (
        'indexedDB' in window &&
        'serviceWorker' in navigator &&
        'caches' in window
    );
};

/**
 * Check if push notifications are supported
 */
export const supportsPushNotifications = (): boolean => {
    if (!isBrowser) return false;

    return (
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window
    );
};

/**
 * Get current online status
 */
export const isOnline = (): boolean => {
    if (!isBrowser) return true;
    return navigator.onLine;
};

/**
 * Wait for online connection
 */
export const waitForOnline = (): Promise<void> => {
    return new Promise((resolve) => {
        if (isOnline()) {
            resolve();
            return;
        }

        const handleOnline = () => {
            window.removeEventListener('online', handleOnline);
            resolve();
        };

        window.addEventListener('online', handleOnline);
    });
};

/**
 * Create a network-aware fetch wrapper
 */
export async function offlineFetch<T = any>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    } catch (error) {
        // If offline, throw a specific error
        if (!isOnline()) {
            throw new Error('OFFLINE');
        }
        throw error;
    }
}

/**
 * Format bytes to human-readable string
 */
export const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get storage estimate
 */
export const getStorageEstimate = async (): Promise<{
    usage: number;
    quota: number;
    usagePercent: number;
    usageFormatted: string;
    quotaFormatted: string;
} | null> => {
    if (!isBrowser || !('storage' in navigator && 'estimate' in navigator.storage)) {
        return null;
    }

    try {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;

        return {
            usage,
            quota,
            usagePercent: quota > 0 ? (usage / quota) * 100 : 0,
            usageFormatted: formatBytes(usage),
            quotaFormatted: formatBytes(quota),
        };
    } catch (error) {
        console.error('[Offline] Failed to get storage estimate:', error);
        return null;
    }
};

/**
 * Request persistent storage
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
    if (!isBrowser || !('storage' in navigator && 'persist' in navigator.storage)) {
        return false;
    }

    try {
        const isPersisted = await navigator.storage.persist();
        console.log('[Offline] Persistent storage:', isPersisted);
        return isPersisted;
    } catch (error) {
        console.error('[Offline] Failed to request persistent storage:', error);
        return false;
    }
};
