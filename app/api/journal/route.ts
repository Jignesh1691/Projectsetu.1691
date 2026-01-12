export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { logAction } from "@/lib/audit-logger";
import { prisma } from "@/lib/prisma";
import { apiResponse, JournalEntrySchema } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { requiresApproval } from "@/lib/permissions";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user.organizationId) {
            return apiResponse.unauthorized();
        }

        const journalEntries = await prisma.journalEntry.findMany({
            where: {
                organizationId: session.user.organizationId as string,
            },
            include: {
                debitLedger: { select: { id: true, name: true } },
                creditLedger: { select: { id: true, name: true } },
                creator: { select: { id: true, name: true, email: true } }
            },
            orderBy: {
                date: 'desc'
            }
        });

        return apiResponse.success(journalEntries);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session || !session.user.organizationId) {
            return apiResponse.unauthorized();
        }

        const body = await req.json();
        const { date, description, amount, debitMode, debitLedgerId, creditMode, creditLedgerId, debitProjectId, creditProjectId } = body;

        // Validation
        if (!date || !amount || !description || !debitMode || !creditMode) {
            return apiResponse.error("Missing required fields");
        }

        if (debitMode === 'ledger' && !debitLedgerId) return apiResponse.error("Debit Ledger ID required");
        if (creditMode === 'ledger' && !creditLedgerId) return apiResponse.error("Credit Ledger ID required");

        // Project ID validation
        if (!debitProjectId) return apiResponse.error("Debit Project ID required");
        if (!creditProjectId) return apiResponse.error("Credit Project ID required");

        const entry = await prisma.journalEntry.create({
            data: {
                date: new Date(date),
                description,
                amount: parseFloat(amount),
                debitMode,
                debitLedgerId: debitMode === 'ledger' && debitLedgerId ? debitLedgerId : null,
                creditMode,
                creditLedgerId: creditMode === 'ledger' && creditLedgerId ? creditLedgerId : null,
                debitProjectId: debitProjectId,
                creditProjectId: creditProjectId,
                organizationId: session.user.organizationId as string,
                createdBy: session.user.id as string,
            },
            include: {
                debitLedger: { select: { id: true, name: true } },
                creditLedger: { select: { id: true, name: true } },
                debitProject: { select: { id: true, name: true } },
                creditProject: { select: { id: true, name: true } },
                creator: { select: { id: true, name: true, email: true } }
            }
        });

        await logAction({
            action: 'CREATE',
            entity: 'JOURNAL',
            entityId: entry.id,
            details: `Created journal entry: ${description} - ${amount}`,
            organizationId: session.user.organizationId as string,
            userId: session.user.id
        });

        return apiResponse.success(entry);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();
    if (!session || !session.user.organizationId) return apiResponse.unauthorized();

    try {
        const json = await req.json();
        const { id, ...data } = json;

        if (!id) return apiResponse.error("Journal ID is required");

        const validation = JournalEntrySchema.partial().safeParse(data);
        if (!validation.success) return apiResponse.error(validation.error.issues[0].message);

        const journal = await prisma.journalEntry.findUnique({ where: { id } });
        if (!journal || journal.organizationId !== session.user.organizationId) return apiResponse.notFound("Journal Entry");

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';
        const { date, amount, description, debitMode, debitLedgerId, creditMode, creditLedgerId, debitProjectId, creditProjectId, requestMessage } = validation.data;

        if (requiresApproval('journal', 'edit', userRole)) {
            const updated = await prisma.journalEntry.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-edit',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage || undefined,
                    pendingData: {
                        date: date ? new Date(date) : undefined,
                        amount,
                        description,
                        debitMode,
                        debitLedgerId,
                        creditMode,
                        creditLedgerId,
                        debitProjectId,
                        creditProjectId
                    } as any,
                }
            });

            await logAction({
                action: 'SUBMIT',
                entity: 'JOURNAL',
                entityId: id,
                details: `Requested update for: ${description}`,
                organizationId: session.user.organizationId as string,
                userId: session.user.id,
                metadata: { pendingData: updated.pendingData }
            });

            return apiResponse.success(updated);
        } else {
            const updated = await prisma.journalEntry.update({
                where: { id },
                data: {
                    date: date ? new Date(date) : undefined,
                    amount,
                    description,
                    debitMode,
                    debitLedgerId: debitMode === 'ledger' && debitLedgerId ? debitLedgerId : null,
                    creditMode,
                    creditLedgerId: creditMode === 'ledger' && creditLedgerId ? creditLedgerId : null,
                    debitProjectId,
                    creditProjectId,
                    approvalStatus: 'approved'
                }
            });

            await logAction({
                action: 'UPDATE',
                entity: 'JOURNAL',
                entityId: id,
                details: `Updated journal entry: ${description}`,
                organizationId: session.user.organizationId as string,
                userId: session.user.id,
                metadata: { updates: validation.data }
            });

            return apiResponse.success(updated);
        }

    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function DELETE(req: Request) {
    const session = await auth();
    if (!session || !session.user.organizationId) return apiResponse.unauthorized();

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const requestMessage = searchParams.get("message");

        if (!id) return apiResponse.error("Journal ID is required");

        const journal = await prisma.journalEntry.findUnique({ where: { id } });
        if (!journal || journal.organizationId !== session.user.organizationId) return apiResponse.notFound("Journal Entry");

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        if (requiresApproval('journal', 'delete', userRole)) {
            const updated = await prisma.journalEntry.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-delete',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage || undefined,
                }
            });

            await logAction({
                action: 'SUBMIT',
                entity: 'JOURNAL',
                entityId: id,
                details: `Requested deletion`,
                organizationId: session.user.organizationId as string,
                userId: session.user.id,
                metadata: { reason: requestMessage }
            });

            return apiResponse.success({ success: true, status: 'pending-delete', data: updated });
        } else {
            await prisma.journalEntry.delete({ where: { id } });

            await logAction({
                action: 'DELETE',
                entity: 'JOURNAL',
                entityId: id,
                details: `Deleted journal entry`,
                organizationId: session.user.organizationId as string,
                userId: session.user.id
            });

            return apiResponse.success({ success: true });
        }
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}
