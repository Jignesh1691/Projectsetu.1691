import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(notifications);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    // Usually notifications are created by the system/admin, but we'll allow an endpoint
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { userId, message, itemId, itemType, type } = await req.json();
        if (!userId || !message) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        const notification = await prisma.notification.create({
            data: {
                userId,
                message,
                itemId,
                itemType,
                type: type || 'info',
            },
        });
        return NextResponse.json(notification);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function PATCH(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id, isRead } = await req.json();
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const existing = await prisma.notification.findUnique({ where: { id } });
        if (!existing || existing.userId !== session.user.id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { isRead },
        });
        return NextResponse.json(updated);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function DELETE(req: Request) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const existing = await prisma.notification.findUnique({ where: { id } });
        if (!existing || existing.userId !== session.user.id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await prisma.notification.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}
