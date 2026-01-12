export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";
import { requiresApproval } from "@/lib/permissions";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const materials = await prisma.material.findMany({
            where: { organizationId: session.user.organizationId as string },
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(materials);
    } catch (error: unknown) {
        console.error("Error fetching materials:", error);
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, unit, requestMessage } = await req.json();

        if (!name || !unit) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Determine approval status
        const approvalStatus = requiresApproval('material', 'create', userRole)
            ? 'pending-create'
            : 'approved';

        const material = await prisma.material.create({
            data: {
                name,
                unit,
                organizationId: session.user.organizationId as string,
                approvalStatus,
                submittedBy: userRole === 'user' ? session.user.id : undefined,
                requestMessage: userRole === 'user' ? requestMessage : undefined,
            },
        });

        return NextResponse.json(material);
    } catch (error: unknown) {
        console.error("Error creating material:", error);
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, name, unit, requestMessage } = await req.json();

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const existing = await prisma.material.findUnique({ where: { id } });
        if (!existing || existing.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Check if approval is required
        if (requiresApproval('material', 'edit', userRole)) {
            // User: Create pending edit request
            const updated = await prisma.material.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-edit',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage,
                    pendingData: {
                        name,
                        unit,
                    } as any,
                }
            });
            return NextResponse.json(updated);
        } else {
            // Admin or no approval required: Apply immediately
            const updated = await prisma.material.update({
                where: { id },
                data: {
                    name,
                    unit,
                    approvalStatus: 'approved',
                },
            });
            return NextResponse.json(updated);
        }
    } catch (error: unknown) {
        console.error("Error updating material:", error);
        return apiResponse.internalError(error);
    }
}

export async function DELETE(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const requestMessage = searchParams.get("message");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const existing = await prisma.material.findUnique({ where: { id } });
        if (!existing || existing.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        if (requiresApproval('material', 'delete', userRole)) {
            // User: Mark for pending deletion
            const updated = await prisma.material.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-delete',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage || undefined,
                }
            });
            return NextResponse.json({ success: true, status: 'pending-delete', material: updated });
        } else {
            // Admin: Delete immediately
            await prisma.material.delete({ where: { id } });
            return NextResponse.json({ success: true });
        }
    } catch (error: unknown) {
        console.error("Error deleting material:", error);
        return apiResponse.internalError(error);
    }
}
