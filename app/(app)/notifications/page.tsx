
'use client';

import React, { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppState } from '@/hooks/use-store';
import { formatDistanceToNow } from 'date-fns';
import { markNotificationsAsRead } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Bell, Check, Info, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from "next-auth/react";

export default function NotificationsPage() {
    const { notifications, appUser } = useAppState();
    const { data: session } = useSession();
    const currentUser = session?.user;

    const userNotifications = useMemo(() => {
        if (!appUser) return [];
        // Admins see all notifications, users see only theirs
        const filtered = appUser.role === 'admin'
            ? notifications
            : notifications.filter(n => n.user_id === appUser.id);

        return [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [notifications, appUser]);

    // Mark notifications as read when the page is viewed by the user
    useEffect(() => {
        if (currentUser && currentUser.id) {
            markNotificationsAsRead(currentUser.id);
        }
    }, [currentUser]);

    const getIcon = (type: string) => {
        if (!type) return <Bell className="h-5 w-5 text-muted-foreground" />;
        if (type.includes('approved')) return <Check className="h-5 w-5 text-green-500" />;
        if (type.includes('rejected')) return <X className="h-5 w-5 text-red-500" />;
        if (type.includes('submitted')) return <Info className="h-5 w-5 text-blue-500" />;
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    };

    const clearAllNotifications = () => {
        // In a real app, this would be an API call. For now, we simulate.
        // This is a placeholder as the store does not have a clear all function yet.
        console.log("Clearing all notifications...");
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
                {/* <Button variant="outline" onClick={clearAllNotifications} disabled={userNotifications.length === 0}>
                    Clear All
                </Button> */}
            </div>

            <Card>
                <CardContent className="p-0">
                    {userNotifications.length > 0 ? (
                        <ul className="divide-y">
                            {userNotifications.map(notification => (
                                <li key={notification.id} className={cn("flex items-start gap-4 p-4", !notification.is_read && 'bg-accent/50')}>
                                    <div className="mt-1">{getIcon(notification.type)}</div>
                                    <div className="flex-1 space-y-1">
                                        <p className="font-medium">{notification.message}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Bell className="h-16 w-16 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No Notifications Yet</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Important updates and actions will appear here.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
