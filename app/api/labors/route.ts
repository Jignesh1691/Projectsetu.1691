import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const labors = await prisma.labor.findMany({
            where: { organizationId: session.user.organizationId },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(labors);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { name, type, rate } = await req.json();
        if (!name || !type || !rate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        const labor = await prisma.labor.create({
            data: {
                name,
                type,
                rate: parseFloat(rate),
                organizationId: session.user.organizationId,
            },
        });
        return NextResponse.json(labor);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();
    if (!session || (session.user as any).role?.toLowerCase() !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { id, name, type, rate } = await req.json();
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const labor = await prisma.labor.findUnique({ where: { id } });
        if (!labor || labor.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const updated = await prisma.labor.update({
            where: { id },
            data: {
                name,
                type,
                rate: rate ? parseFloat(rate) : undefined,
            },
        });
        return NextResponse.json(updated);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function DELETE(req: Request) {
    const session = await auth();
    if (!session || (session.user as any).role?.toLowerCase() !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const labor = await prisma.labor.findUnique({ where: { id } });
        if (!labor || labor.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await prisma.labor.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}
