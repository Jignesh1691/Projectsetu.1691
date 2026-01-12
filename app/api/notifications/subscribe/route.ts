import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/notifications/subscribe
 * Save or update push notification subscription
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

        const body = await req.json();
        const { endpoint, keys } = body;

        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return NextResponse.json(
                { error: 'Invalid subscription data' },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if subscription already exists
        const existingSubscription = await prisma.pushSubscription.findUnique({
            where: { endpoint },
        });

        if (existingSubscription) {
            // Update existing subscription
            await prisma.pushSubscription.update({
                where: { endpoint },
                data: {
                    userId: user.id,
                    keys,
                    updatedAt: new Date(),
                },
            });
        } else {
            // Create new subscription
            await prisma.pushSubscription.create({
                data: {
                    userId: user.id,
                    endpoint,
                    keys,
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Push subscription error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/notifications/subscribe
 * Remove push notification subscription
 */
export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.email) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json(
                { error: 'Endpoint is required' },
                { status: 400 }
            );
        }

        // Delete subscription
        await prisma.pushSubscription.deleteMany({
            where: { endpoint },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Push unsubscribe error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
