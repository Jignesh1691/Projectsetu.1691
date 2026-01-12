/**
 * Client-side push notification handler
 */

'use client';

import { urlBase64ToUint8Array } from './vapid';

export interface PushSubscriptionData {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/**
 * Get current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
    if (!isPushSupported()) {
        return 'denied';
    }
    return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isPushSupported()) {
        throw new Error('Push notifications are not supported in this browser');
    }

    const permission = await Notification.requestPermission();
    console.log('[Push] Permission:', permission);
    return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscriptionData> {
    if (!isPushSupported()) {
        throw new Error('Push notifications are not supported');
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If no subscription, create one
    if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey) as BufferSource;

        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
        });

        console.log('[Push] New subscription created');
    } else {
        console.log('[Push] Using existing subscription');
    }

    // Convert to JSON format
    const subscriptionJSON = subscription.toJSON();

    if (!subscriptionJSON.endpoint || !subscriptionJSON.keys) {
        throw new Error('Invalid subscription data');
    }

    return {
        endpoint: subscriptionJSON.endpoint,
        keys: {
            p256dh: subscriptionJSON.keys.p256dh,
            auth: subscriptionJSON.keys.auth,
        },
    };
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    if (!isPushSupported()) {
        return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
        const success = await subscription.unsubscribe();
        console.log('[Push] Unsubscribed:', success);
        return success;
    }

    return false;
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscriptionData | null> {
    if (!isPushSupported()) {
        return null;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
        return null;
    }

    const subscriptionJSON = subscription.toJSON();

    if (!subscriptionJSON.endpoint || !subscriptionJSON.keys) {
        return null;
    }

    return {
        endpoint: subscriptionJSON.endpoint,
        keys: {
            p256dh: subscriptionJSON.keys.p256dh,
            auth: subscriptionJSON.keys.auth,
        },
    };
}

/**
 * Save subscription to backend
 */
export async function saveSubscription(subscription: PushSubscriptionData): Promise<boolean> {
    try {
        const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscription),
            credentials: 'include',
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to save subscription: ${error}`);
        }

        console.log('[Push] Subscription saved to backend');
        return true;
    } catch (error) {
        console.error('[Push] Failed to save subscription:', error);
        throw error;
    }
}

/**
 * Delete subscription from backend
 */
export async function deleteSubscription(endpoint: string): Promise<boolean> {
    try {
        const response = await fetch('/api/notifications/subscribe', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ endpoint }),
            credentials: 'include',
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to delete subscription: ${error}`);
        }

        console.log('[Push] Subscription deleted from backend');
        return true;
    } catch (error) {
        console.error('[Push] Failed to delete subscription:', error);
        throw error;
    }
}

/**
 * Enable push notifications (request permission + subscribe + save)
 */
export async function enablePushNotifications(vapidPublicKey: string): Promise<boolean> {
    try {
        // Request permission
        const permission = await requestNotificationPermission();

        if (permission !== 'granted') {
            console.log('[Push] Permission denied');
            return false;
        }

        // Subscribe to push
        const subscription = await subscribeToPush(vapidPublicKey);

        // Save to backend
        await saveSubscription(subscription);

        console.log('[Push] Push notifications enabled successfully');
        return true;
    } catch (error) {
        console.error('[Push] Failed to enable push notifications:', error);
        throw error;
    }
}

/**
 * Disable push notifications (unsubscribe + delete from backend)
 */
export async function disablePushNotifications(): Promise<boolean> {
    try {
        const subscription = await getCurrentSubscription();

        if (subscription) {
            // Delete from backend first
            await deleteSubscription(subscription.endpoint);

            // Then unsubscribe locally
            await unsubscribeFromPush();
        }

        console.log('[Push] Push notifications disabled successfully');
        return true;
    } catch (error) {
        console.error('[Push] Failed to disable push notifications:', error);
        throw error;
    }
}
