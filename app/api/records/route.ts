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
                    status: 'active',
                    canViewFinances: true
                },
                select: { projectId: true }
            });
            const assignedProjectIds = assignedProjects.map(ap => ap.projectId);
            projectFilter = {
                projectId: { in: assignedProjectIds }
            };
        }

        const { searchParams } = new URL(req.url);
        const createdBy = searchParams.get('createdBy');
        const limit = parseInt(searchParams.get('limit') || '100');
        const page = parseInt(searchParams.get('page') || '1');
        const skip = (page - 1) * limit;

        const records = await prisma.record.findMany({
            where: {
                organizationId: session.user.organizationId as string,
                ...projectFilter,
                ...(createdBy ? { createdBy } : {}),
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: { dueDate: 'desc' },
            take: limit,
            skip: skip,
        });

        return NextResponse.json(records);
    } catch (error: unknown) {
        console.error("Error fetching records:", error);
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { type, amount, description, dueDate, projectId, ledgerId, paymentMode, status, requestMessage } = await req.json();

        if (!type || !amount || !description || !dueDate || !projectId || !ledgerId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Project access check for non-admins
        if (userRole !== 'admin') {
            const projectUser = await prisma.projectUser.findUnique({
                where: {
                    projectId_userId: {
                        projectId,
                        userId: session.user.id
                    }
                }
            });

            if (!projectUser || projectUser.status !== 'active') {
                return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
            }

            if (!projectUser.canCreateEntries) {
                return NextResponse.json({ error: "You don't have permission to create financial entries for this project" }, { status: 403 });
            }
        }

        // Determine approval status
        const approvalStatus = requiresApproval('record', 'create', userRole)
            ? 'pending-create'
            : 'approved';

        const record = await prisma.record.create({
            data: {
                type,
                amount: parseFloat(amount),
                description,
                dueDate: new Date(dueDate),
                projectId,
                ledgerId,
                paymentMode: paymentMode || 'cash',
                status: status || 'pending',
                organizationId: session.user.organizationId as string,
                createdBy: session.user.id,
                approvalStatus,
                submittedBy: userRole === 'user' ? session.user.id : undefined,
                requestMessage: userRole === 'user' ? requestMessage : undefined,
            },
        });

        return NextResponse.json(record);
    } catch (error: unknown) {
        console.error("Error creating record:", error);
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, type, amount, description, dueDate, projectId, ledgerId, paymentMode, status, requestMessage } = await req.json();

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const existing = await prisma.record.findUnique({ where: { id } });
        if (!existing || existing.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Project access check for non-admins
        if (userRole !== 'admin') {
            const projectUsers = await prisma.projectUser.findMany({
                where: { userId: session.user.id }
            });
            // Check access to current project
            if (!canAccessProject(existing.projectId, session.user.id, userRole, projectUsers as any)) {
                return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
            }
            // If changing project, check access to new project
            if (projectId && projectId !== existing.projectId) {
                if (!canAccessProject(projectId, session.user.id, userRole, projectUsers as any)) {
                    return NextResponse.json({ error: "You don't have access to the target project" }, { status: 403 });
                }
            }
        }

        // Check if approval is required
        if (requiresApproval('record', 'edit', userRole)) {
            // User: Create pending edit request
            const updated = await prisma.record.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-edit',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage,
                    pendingData: {
                        type,
                        amount: amount ? parseFloat(amount) : undefined,
                        description,
                        dueDate: dueDate ? new Date(dueDate) : undefined,
                        projectId,
                        ledgerId,
                        paymentMode,
                        status,
                    } as any,
                }
            });
            return NextResponse.json(updated);
        } else {
            // Admin or no approval required: Apply immediately
            const updated = await prisma.record.update({
                where: { id },
                data: {
                    type,
                    amount: amount ? parseFloat(amount) : undefined,
                    description,
                    dueDate: dueDate ? new Date(dueDate) : undefined,
                    projectId,
                    ledgerId,
                    paymentMode,
                    status,
                    approvalStatus: 'approved',
                },
            });
            return NextResponse.json(updated);
        }
    } catch (error: unknown) {
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

        const existing = await prisma.record.findUnique({ where: { id } });
        if (!existing || existing.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Project access check for non-admins
        if (userRole !== 'admin') {
            const projectUsers = await prisma.projectUser.findMany({
                where: { userId: session.user.id }
            });
            if (!canAccessProject(existing.projectId, session.user.id, userRole, projectUsers as any)) {
                return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
            }
        }

        if (requiresApproval('record', 'delete', userRole)) {
            // User: Mark for pending deletion
            const updated = await prisma.record.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-delete',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage || undefined,
                }
            });
            return NextResponse.json({ success: true, status: 'pending-delete', record: updated });
        } else {
            // Admin: Delete immediately
            await prisma.record.delete({ where: { id } });
            return NextResponse.json({ success: true });
        }
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}
