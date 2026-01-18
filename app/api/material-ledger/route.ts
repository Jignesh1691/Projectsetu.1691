export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";
import { requiresApproval, canAccessProject } from "@/lib/permissions";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';
        const userId = session.user.id;

        // Filter by projects assigned to the user if not admin
        let projectFilter = {};
        if (userRole !== 'admin') {
            const assignedProjects = await prisma.projectUser.findMany({
                where: {
                    userId,
                    status: 'active'
                },
                select: { projectId: true }
            });
            const assignedProjectIds = assignedProjects.map(ap => ap.projectId);
            projectFilter = {
                projectId: { in: assignedProjectIds }
            };
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;

        const entries = await prisma.materialLedger.findMany({
            where: {
                organizationId: session.user.organizationId as string,
                ...projectFilter
            },
            orderBy: { date: 'desc' },
            take: limit,
            skip: skip,
        });

        return NextResponse.json(entries);
    } catch (error: unknown) {
        console.error("Error fetching material ledger entries:", error);
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { date, type, quantity, description, challanUrl, materialId, projectId, requestMessage } = await req.json();
        if (!date || !type || !quantity || !materialId || !projectId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Project access check for non-admins
        if (userRole !== 'admin') {
            const projectUsers = await prisma.projectUser.findMany({
                where: { userId: session.user.id }
            });
            if (!canAccessProject(projectId, session.user.id, userRole, projectUsers as any)) {
                return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
            }
        }

        // Determine approval status
        const approvalStatus = requiresApproval('materialledger', 'create', userRole)
            ? 'pending-create'
            : 'approved';

        const entry = await prisma.materialLedger.create({
            data: {
                date: new Date(date),
                type,
                quantity: parseFloat(quantity),
                description,
                challanUrl,
                materialId,
                projectId,
                organizationId: session.user.organizationId as string,
                createdBy: session.user.id,
                approvalStatus,
                submittedBy: userRole === 'user' ? session.user.id : undefined,
                requestMessage: userRole === 'user' ? requestMessage : undefined,
            },
        });

        return NextResponse.json(entry);
    } catch (error: unknown) {
        console.error("Error creating material ledger entry:", error);
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();
    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, date, type, quantity, description, challanUrl, materialId, projectId, requestMessage } = await req.json();
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const existing = await prisma.materialLedger.findUnique({ where: { id } });
        if (!existing || existing.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Check if approval is required
        if (requiresApproval('materialledger', 'edit', userRole)) {
            // User: Create pending edit request
            const updated = await prisma.materialLedger.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-edit',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage,
                    pendingData: {
                        date: date ? new Date(date) : undefined,
                        type,
                        quantity: quantity ? parseFloat(quantity) : undefined,
                        description,
                        challanUrl,
                        materialId,
                        projectId,
                    } as any,
                }
            });
            return NextResponse.json(updated);
        } else {
            // Admin or no approval required: Apply immediately
            const updated = await prisma.materialLedger.update({
                where: { id },
                data: {
                    date: date ? new Date(date) : undefined,
                    type,
                    quantity: quantity ? parseFloat(quantity) : undefined,
                    description,
                    challanUrl,
                    materialId,
                    projectId,
                    approvalStatus: 'approved',
                },
            });
            return NextResponse.json(updated);
        }
    } catch (error: unknown) {
        console.error("Error updating material ledger entry:", error);
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

        const existing = await prisma.materialLedger.findUnique({ where: { id } });
        if (!existing || existing.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        if (requiresApproval('materialledger', 'delete', userRole)) {
            // User: Mark for pending deletion
            const updated = await prisma.materialLedger.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-delete',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage || undefined,
                }
            });
            return NextResponse.json({ success: true, status: 'pending-delete', entry: updated });
        } else {
            // Admin: Delete immediately
            await prisma.materialLedger.delete({ where: { id } });
            return NextResponse.json({ success: true });
        }
    } catch (error: unknown) {
        console.error("Error deleting material ledger entry:", error);
        return apiResponse.internalError(error);
    }
}
