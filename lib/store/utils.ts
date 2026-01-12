'use client';

import { updateState } from './state-manager';
import { Notification } from '../definitions';

export const deleteAllData = async () => {
    if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.location.reload();
    }
};

export const resetData = async () => {
    if (typeof window !== 'undefined') {
        window.localStorage.removeItem('ledgerlink_app_state');
        window.location.reload();
    }
}

export const setFullState = (newState: any) => {
    updateState(prev => ({ ...prev, ...newState }));
};

export const markNotificationsAsRead = async (userId: string) => {
    try {
        const unread = (await (await fetch('/api/notifications')).json()).filter((n: any) => !n.isRead);

        for (const n of unread) {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: n.id, isRead: true }),
            });
        }

        updateState(prev => ({
            ...prev,
            notifications: prev.notifications.map((n: Notification) =>
                n.user_id === userId ? { ...n, is_read: true } : n
            )
        }));
    } catch (error) {
        console.error("Error marking notifications as read:", error);
    }
};
