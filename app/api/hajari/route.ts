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

        const hajari = await prisma.hajari.findMany({
            where: {
                organizationId: session.user.organizationId as string,
                ...projectFilter
            },
            orderBy: { date: 'desc' },
            take: limit,
            skip: skip,
        });

        return NextResponse.json(hajari);
    } catch (error: unknown) {
        console.error("Error fetching hajari:", error);
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const body = await req.json();
        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Support both raw array (legacy) and { records, requestMessage } object
        const isBulk = Array.isArray(body) || (body.records && Array.isArray(body.records));
        const recordsToCreate = Array.isArray(body) ? body : body.records;
        const requestMessage = body.requestMessage;

        if (isBulk) {
            // Bulk create - Creation is immediate for Hajari
            const approvalStatus = requiresApproval('hajari', 'create', userRole)
                ? 'pending-create'
                : 'approved';

            const data = recordsToCreate.map((r: any) => ({
                date: new Date(r.date),
                status: r.status,
                overtimeHours: parseFloat(r.overtimeHours || 0),
                upad: parseFloat(r.upad || 0),
                laborId: r.laborId,
                projectId: r.projectId,
                organizationId: session.user.organizationId as string,
                createdBy: session.user.id,
                approvalStatus,
                submittedBy: userRole === 'user' ? session.user.id : undefined,
                requestMessage: userRole === 'user' ? requestMessage : undefined,
            }));

            await prisma.hajari.createMany({
                data,
            });

            return NextResponse.json({ success: true });
        } else {
            const { date, status, overtimeHours, upad, laborId, projectId, requestMessage } = body;
            const isSettlement = status === 'settlement' || status === 'pending-settlement';

            if (!date || !status || !laborId || (!isSettlement && !projectId)) {
                return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
            }

            // Project access check for non-admins
            if (userRole !== 'admin' && projectId) {
                const projectUsers = await prisma.projectUser.findMany({
                    where: { userId: session.user.id }
                });
                if (!canAccessProject(projectId, session.user.id, userRole, projectUsers as any)) {
                    return NextResponse.json({ error: "You don't have access to this project" }, { status: 403 });
                }
            }

            // Determine approval status
            const approvalStatus = requiresApproval('hajari', 'create', userRole)
                ? 'pending-create'
                : 'approved';

            const hajari = await prisma.hajari.create({
                data: {
                    date: new Date(date),
                    status,
                    overtimeHours: parseFloat(overtimeHours || 0),
                    upad: parseFloat(upad || 0),
                    laborId,
                    projectId,
                    organizationId: session.user.organizationId as string,
                    createdBy: session.user.id,
                    approvalStatus,
                    submittedBy: userRole === 'user' ? session.user.id : undefined,
                    requestMessage: userRole === 'user' ? requestMessage : undefined,
                },
            });
            return NextResponse.json(hajari);
        }
    } catch (error: unknown) {
        console.error("Error creating hajari:", error);
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();
    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, date, status, overtimeHours, upad, laborId, projectId, requestMessage } = await req.json();
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const existing = await prisma.hajari.findUnique({ where: { id } });
        if (!existing || existing.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Check if approval is required
        if (requiresApproval('hajari', 'edit', userRole)) {
            // User: Create pending edit request
            const updated = await prisma.hajari.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-edit',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage,
                    pendingData: {
                        date: date ? new Date(date) : undefined,
                        status,
                        overtimeHours: overtimeHours !== undefined ? parseFloat(overtimeHours) : undefined,
                        upad: upad !== undefined ? parseFloat(upad) : undefined,
                        laborId,
                        projectId,
                    } as any,
                }
            });
            return NextResponse.json(updated);
        } else {
            // Admin or no approval required: Apply immediately
            const updated = await prisma.hajari.update({
                where: { id },
                data: {
                    date: date ? new Date(date) : undefined,
                    status,
                    overtimeHours: overtimeHours !== undefined ? parseFloat(overtimeHours) : undefined,
                    upad: upad !== undefined ? parseFloat(upad) : undefined,
                    laborId,
                    projectId,
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

        const existing = await prisma.hajari.findUnique({ where: { id } });
        if (!existing || existing.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        if (requiresApproval('hajari', 'delete', userRole)) {
            // User: Mark for pending deletion
            const updated = await prisma.hajari.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-delete',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage || undefined,
                }
            });
            return NextResponse.json({ success: true, status: 'pending-delete', hajari: updated });
        } else {
            // Admin: Delete immediately
            await prisma.hajari.delete({ where: { id } });
            return NextResponse.json({ success: true });
        }
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}
