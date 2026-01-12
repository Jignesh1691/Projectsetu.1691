export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { logAction } from "@/lib/audit-logger";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requiresApproval, canAccessProject } from "@/lib/permissions";
import { apiResponse, TransactionSchema } from "@/lib/api-utils";
import { z } from "zod";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user.organizationId) {
            return apiResponse.unauthorized();
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';
        const userId = session.user.id;

        // Parse query parameters
        const { searchParams } = new URL(req.url);
        const createdBy = searchParams.get('createdBy');

        // If user is not admin, we may want to filter transactions by projects they are assigned to
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

        const transactions = await prisma.transaction.findMany({
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
            orderBy: {
                date: 'desc',
            },
        });

        return apiResponse.success(transactions);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return apiResponse.unauthorized();
    }

    try {
        const json = await req.json();
        const validation = TransactionSchema.safeParse(json);

        if (!validation.success) {
            return apiResponse.error(validation.error.issues[0].message);
        }

        const { type, amount, description, date, projectId, ledgerId, paymentMode, convertedFromRecordId, hajariSettlementId, requestMessage } = validation.data;

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Project access check for non-admins
        if (userRole !== 'admin' && projectId) {
            const projectUsers = await prisma.projectUser.findMany({
                where: { userId: session.user.id }
            });
            if (!canAccessProject(projectId, session.user.id, userRole, projectUsers as any)) {
                return apiResponse.forbidden("You don't have access to this project");
            }
        }

        // Determine approval status
        const approvalStatus = requiresApproval('transaction', 'create', userRole)
            ? 'pending-create'
            : 'approved';

        const transaction = await prisma.transaction.create({
            data: {
                type,
                amount,
                description,
                date: new Date(date),
                paymentMode: paymentMode || 'cash',
                projectId,
                ledgerId,
                organizationId: session.user.organizationId as string,
                createdBy: session.user.id,
                convertedFromRecordId: convertedFromRecordId || undefined,
                hajariSettlementId: hajariSettlementId || undefined,
                approvalStatus,
                submittedBy: userRole === 'user' ? session.user.id : undefined,
                requestMessage: userRole === 'user' ? (requestMessage || undefined) : undefined,
            },
        });

        await logAction({
            action: approvalStatus === 'approved' ? 'CREATE' : 'SUBMIT',
            entity: 'TRANSACTION',
            entityId: transaction.id,
            details: `Created transaction: ${description} - ${amount}`,
            organizationId: session.user.organizationId as string,
            userId: session.user.id,
            metadata: { type: 'transaction' }
        });

        return apiResponse.success(transaction, 201);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return apiResponse.unauthorized();
    }

    try {
        const json = await req.json();
        const { id, ...data } = json;

        if (!id) {
            return apiResponse.error("Transaction ID is required");
        }

        const validation = TransactionSchema.partial().safeParse(data);
        if (!validation.success) {
            return apiResponse.error(validation.error.issues[0].message);
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
        });

        if (!transaction || transaction.organizationId !== session.user.organizationId) {
            return apiResponse.notFound("Transaction");
        }

        // Prevent editing if it's a converted or settlement transaction
        if (transaction.convertedFromRecordId || transaction.hajariSettlementId) {
            return apiResponse.error("Cannot edit an automated transaction. Please revert it instead.");
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        const { type, amount, description, date, projectId, ledgerId, paymentMode, requestMessage } = validation.data;

        // Check if approval is required
        if (requiresApproval('transaction', 'edit', userRole)) {
            // User: Create pending edit request
            const updated = await prisma.transaction.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-edit',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage || undefined,
                    pendingData: {
                        type,
                        amount,
                        description,
                        date: date ? new Date(date) : undefined,
                        projectId: projectId || undefined,
                        ledgerId: ledgerId || undefined,
                        paymentMode,
                    } as any,
                }
            });

            await logAction({
                action: 'SUBMIT',
                entity: 'TRANSACTION',
                entityId: id,
                details: `Requested update for: ${description}`,
                organizationId: session.user.organizationId as string,
                userId: session.user.id,
                metadata: { pendingData: updated.pendingData }
            });

            return apiResponse.success(updated);
        } else {
            // Admin or no approval required: Apply immediately
            const updatedTransaction = await prisma.transaction.update({
                where: { id },
                data: {
                    type,
                    amount,
                    description,
                    date: date ? new Date(date) : undefined,
                    projectId: projectId || undefined,
                    ledgerId: ledgerId || undefined,
                    paymentMode,
                    approvalStatus: 'approved', // Reset to approved just in case
                },
            });

            await logAction({
                action: 'UPDATE',
                entity: 'TRANSACTION',
                entityId: id,
                details: `Updated transaction: ${description}`,
                organizationId: session.user.organizationId as string,
                userId: session.user.id,
                metadata: { updates: validation.data }
            });

            return apiResponse.success(updatedTransaction);
        }
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function DELETE(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return apiResponse.unauthorized();
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const requestMessage = searchParams.get("message");

        if (!id) {
            return apiResponse.error("Transaction ID is required");
        }

        const transaction = await prisma.transaction.findUnique({
            where: { id },
        });

        if (!transaction || transaction.organizationId !== session.user.organizationId) {
            return apiResponse.notFound("Transaction");
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Prevent deleting if it's a converted transaction (unless revert)
        const isRevert = searchParams.get("revert") === "true";
        if ((transaction.convertedFromRecordId || transaction.hajariSettlementId) && !isRevert) {
            return apiResponse.error("Cannot delete an automated transaction. Please revert it instead.");
        }

        if (requiresApproval('transaction', 'delete', userRole)) {
            // User: Mark for pending deletion
            const updated = await prisma.transaction.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-delete',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage || undefined,
                }
            });

            await logAction({
                action: 'SUBMIT',
                entity: 'TRANSACTION',
                entityId: id,
                details: `Requested deletion`,
                organizationId: session.user.organizationId as string,
                userId: session.user.id,
                metadata: { reason: requestMessage }
            });

            return apiResponse.success({ success: true, status: 'pending-delete', transaction: updated });
        } else {
            // Admin: Delete immediately
            await prisma.transaction.delete({
                where: { id },
            });

            await logAction({
                action: 'DELETE',
                entity: 'TRANSACTION',
                entityId: id,
                details: `Deleted transaction`,
                organizationId: session.user.organizationId as string,
                userId: session.user.id
            });

            return apiResponse.success({ success: true });
        }
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}
