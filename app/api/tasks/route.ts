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

        const tasks = await prisma.task.findMany({
            where: {
                organizationId: session.user.organizationId as string,
                ...projectFilter
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(tasks);
    } catch (error: unknown) {
        console.error("Error fetching tasks:", error);
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { title, description, status, dueDate, projectId, requestMessage } = await req.json();

        if (!title || !projectId) {
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
        const approvalStatus = requiresApproval('task', 'create', userRole)
            ? 'pending-create'
            : 'approved';

        const task = await prisma.task.create({
            data: {
                title,
                description,
                status: status || 'todo',
                dueDate: dueDate ? new Date(dueDate) : null,
                projectId,
                organizationId: session.user.organizationId as string,
                createdBy: session.user.id,
                approvalStatus,
                submittedBy: userRole === 'user' ? session.user.id : undefined,
                requestMessage: userRole === 'user' ? requestMessage : undefined,
            },
        });

        return NextResponse.json(task);
    } catch (error: unknown) {
        console.error("Error creating task:", error);
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, title, description, status, dueDate, projectId, requestMessage } = await req.json();

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const existing = await prisma.task.findUnique({ where: { id } });
        if (!existing || existing.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Check if approval is required
        if (requiresApproval('task', 'edit', userRole)) {
            // User: Create pending edit request
            const updated = await prisma.task.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-edit',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage,
                    pendingData: {
                        title,
                        description,
                        status,
                        dueDate: dueDate ? new Date(dueDate) : undefined,
                        projectId,
                    } as any,
                }
            });
            return NextResponse.json(updated);
        } else {
            // Admin or no approval required: Apply immediately
            const updated = await prisma.task.update({
                where: { id },
                data: {
                    title,
                    description,
                    status,
                    dueDate: dueDate ? new Date(dueDate) : undefined,
                    projectId,
                    approvalStatus: 'approved',
                },
            });
            return NextResponse.json(updated);
        }
    } catch (error: unknown) {
        console.error("Error updating task:", error);
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

        const existing = await prisma.task.findUnique({ where: { id } });
        if (!existing || existing.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        if (requiresApproval('task', 'delete', userRole)) {
            // User: Mark for pending deletion
            const updated = await prisma.task.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-delete',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage || undefined,
                }
            });
            return NextResponse.json({ success: true, status: 'pending-delete', task: updated });
        } else {
            // Admin: Delete immediately
            await prisma.task.delete({ where: { id } });
            return NextResponse.json({ success: true });
        }
    } catch (error: unknown) {
        console.error("Error deleting task:", error);
        return apiResponse.internalError(error);
    }
}
