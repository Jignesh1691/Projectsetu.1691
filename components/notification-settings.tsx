/**
 * Notification Settings Component
 * Manage push notification preferences
 */

'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
    isPushSupported,
    getNotificationPermission,
    enablePushNotifications,
    disablePushNotifications,
    getCurrentSubscription,
} from '@/lib/notifications/push';

export function NotificationSettings() {
    const [supported, setSupported] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const { toast } = useToast();

    useEffect(() => {
        checkSupport();
    }, []);

    const checkSupport = async () => {
        const isSupported = isPushSupported();
        setSupported(isSupported);

        if (isSupported) {
            const currentPermission = getNotificationPermission();
            setPermission(currentPermission);

            // Check if already subscribed
            const subscription = await getCurrentSubscription();
            setEnabled(subscription !== null && currentPermission === 'granted');
        }
    };

    const handleToggle = async (checked: boolean) => {
        setLoading(true);

        try {
            if (checked) {
                // Enable notifications
                const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

                if (!vapidKey) {
                    throw new Error('VAPID public key not configured');
                }

                const success = await enablePushNotifications(vapidKey);

                if (success) {
                    setEnabled(true);
                    setPermission('granted');
                    toast({
                        title: 'Notifications enabled',
                        description: 'You will now receive push notifications',
                    });
                } else {
                    toast({
                        title: 'Permission denied',
                        description: 'Please allow notifications in your browser settings',
                        variant: 'destructive',
                    });
                }
            } else {
                // Disable notifications
                await disablePushNotifications();
                setEnabled(false);
                toast({
                    title: 'Notifications disabled',
                    description: 'You will no longer receive push notifications',
                });
            }
        } catch (error) {
            console.error('Notification toggle error:', error);
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to update notification settings',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const testNotification = async () => {
        if (!enabled) {
            toast({
                title: 'Notifications disabled',
                description: 'Enable notifications first',
                variant: 'destructive',
            });
            return;
        }

        // Show a local test notification
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification('Test Notification', {
                body: 'This is a test notification from ProjectSetu',
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'test',
            });

            toast({
                title: 'Test notification sent',
                description: 'Check your notifications',
            });
        } catch (error) {
            console.error('Test notification error:', error);
            toast({
                title: 'Error',
                description: 'Failed to send test notification',
                variant: 'destructive',
            });
        }
    };

    if (!supported) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BellOff className="h-5 w-5" />
                        Push Notifications
                    </CardTitle>
                    <CardDescription>
                        Push notifications are not supported in your browser
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Push Notifications
                </CardTitle>
                <CardDescription>
                    Get notified about important updates and approvals
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label htmlFor="notifications-toggle" className="flex flex-col gap-1">
                        <span className="font-medium">Enable notifications</span>
                        <span className="text-sm text-muted-foreground">
                            {permission === 'denied'
                                ? 'Notifications blocked - check browser settings'
                                : 'Receive real-time updates'}
                        </span>
                    </Label>
                    <Switch
                        id="notifications-toggle"
                        checked={enabled}
                        onCheckedChange={handleToggle}
                        disabled={loading || permission === 'denied'}
                    />
                </div>

                {enabled && (
                    <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                        <p className="text-sm text-muted-foreground">
                            You will receive notifications for:
                        </p>
                        <ul className="ml-4 list-disc space-y-1 text-sm">
                            <li>Approval requests</li>
                            <li>Approvals and rejections</li>
                            <li>Hajari settlements</li>
                            <li>Important updates</li>
                        </ul>
                    </div>
                )}

                {enabled && (
                    <Button
                        variant="outline"
                        onClick={testNotification}
                        className="w-full"
                    >
                        Send Test Notification
                    </Button>
                )}

                {loading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Updating settings...</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
