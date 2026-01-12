'use client';

import { useEffect } from 'react';
import { offlineDB } from '@/lib/offline/db';
import { requestPersistentStorage } from '@/lib/offline/utils';

export function PWARegistration() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', async () => {
                try {
                    // Register service worker
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    console.log('[PWA] Service Worker registered with scope:', registration.scope);

                    // Initialize offline database
                    await offlineDB.init();
                    console.log('[PWA] Offline database initialized');

                    // Request persistent storage
                    const isPersisted = await requestPersistentStorage();
                    console.log('[PWA] Persistent storage:', isPersisted);

                    // Register for background sync
                    if ('sync' in registration) {
                        try {
                            await (registration as any).sync.register('sync-queue');
                            console.log('[PWA] Background sync registered');
                        } catch (error) {
                            console.warn('[PWA] Background sync not available:', error);
                        }
                    }

                    // Listen for service worker updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('[PWA] New version available, please refresh');
                                    // You could show a toast here to prompt user to refresh
                                }
                            });
                        }
                    });
                } catch (error) {
                    console.error('[PWA] Service Worker registration failed:', error);
                }
            });
        }
    }, []);

    return null;
}
