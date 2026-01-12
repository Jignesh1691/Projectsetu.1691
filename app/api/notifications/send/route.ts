import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/notifications/send
 * Send push notification to users
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check if user has admin role
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                memberships: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Only admins and system can send notifications
        const isAdmin = user.memberships.some(m => m.role === 'ADMIN');

        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Forbidden - Admin access required' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { userIds, title, message, data, url } = body;

        if (!title || !message) {
            return NextResponse.json(
                { error: 'Title and message are required' },
                { status: 400 }
            );
        }

        // Get subscriptions for target users
        const subscriptions = await prisma.pushSubscription.findMany({
            where: userIds ? { userId: { in: userIds } } : {},
        });

        if (subscriptions.length === 0) {
            return NextResponse.json(
                { message: 'No subscriptions found' },
                { status: 200 }
            );
        }

        // Import web-push dynamically
        const webpush = await import('web-push');
        const { getVapidPublicKey, getVapidPrivateKey, getVapidSubject } = await import('@/lib/notifications/vapid');

        // Configure web-push
        webpush.setVapidDetails(
            getVapidSubject(),
            getVapidPublicKey(),
            getVapidPrivateKey()
        );

        const payload = JSON.stringify({
            title,
            body: message,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: {
                ...data,
                url: url || '/',
            },
        });

        // Send notifications
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    const pushConfig = {
                        endpoint: sub.endpoint,
                        keys: sub.keys as { p256dh: string; auth: string },
                    };

                    await webpush.sendNotification(pushConfig, payload);
                    return { success: true, endpoint: sub.endpoint };
                } catch (error: any) {
                    console.error('[Push] Send failed:', error);

                    // If subscription is invalid, delete it
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        await prisma.pushSubscription.delete({
                            where: { id: sub.id },
                        });
                    }

                    return { success: false, endpoint: sub.endpoint, error: error.message || 'Unknown error' };
                }
            })
        );

        const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
        const failed = results.length - successful;

        return NextResponse.json({
            success: true,
            sent: successful,
            failed,
            total: results.length,
        });
    } catch (error) {
        console.error('[API] Push send error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
