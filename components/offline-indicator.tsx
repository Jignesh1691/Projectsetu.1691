/**
 * Offline Indicator Component
 * Shows online/offline status and pending sync count
 */

'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { syncManager } from '@/lib/offline/sync';
import { isOnline } from '@/lib/offline/utils';

export function OfflineIndicator() {
    const [online, setOnline] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        // Initialize online status
        setOnline(isOnline());

        // Listen for online/offline events
        const handleOnline = () => {
            setOnline(true);
        };

        const handleOffline = () => {
            setOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Update pending count
        const updatePendingCount = async () => {
            const count = await syncManager.getPendingCount();
            setPendingCount(count);
        };

        updatePendingCount();
        const intervalId = setInterval(updatePendingCount, 5000); // Update every 5 seconds

        // Listen for sync events
        const unsubscribe = syncManager.onSync((result) => {
            setSyncing(false);
            updatePendingCount();
        });

        // Check if syncing
        const checkSyncing = () => {
            setSyncing(syncManager.isSyncing());
        };

        const syncCheckInterval = setInterval(checkSyncing, 1000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(intervalId);
            clearInterval(syncCheckInterval);
            unsubscribe();
        };
    }, []);

    // Don't show anything if online and no pending items
    if (online && pendingCount === 0 && !syncing) {
        return null;
    }

    return (
        <div
            className={cn(
                'fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-lg backdrop-blur-sm transition-all',
                online
                    ? 'bg-emerald-500/90 text-white'
                    : 'bg-amber-500/90 text-white'
            )}
        >
            {syncing ? (
                <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Syncing...</span>
                </>
            ) : online ? (
                <>
                    <Wifi className="h-4 w-4" />
                    <span>Syncing {pendingCount} items</span>
                </>
            ) : (
                <>
                    <WifiOff className="h-4 w-4" />
                    <span>
                        Offline {pendingCount > 0 && `(${pendingCount} pending)`}
                    </span>
                </>
            )}
        </div>
    );
}
