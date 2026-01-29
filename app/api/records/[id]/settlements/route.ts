import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse, RecordSettlementSchema } from "@/lib/api-utils";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session || !session.user.organizationId) {
            return apiResponse.unauthorized();
        }

        const settlements = await (prisma as any).recordSettlement.findMany({
            where: {
                recordId: params.id,
                organizationId: session.user.organizationId
            },
            include: {
                financialAccount: true,
                creator: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { settlementDate: 'desc' }
        });

        return apiResponse.success(settlements);
    } catch (error: unknown) {
        return apiResponse.internalError(error);
    }
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session || !session.user.organizationId) {
            return apiResponse.unauthorized();
        }

        const json = await req.json();
        const validation = RecordSettlementSchema.safeParse({ ...json, recordId: params.id });

        if (!validation.success) {
            return apiResponse.error(validation.error.issues[0].message);
        }

        const data = validation.data;
        const organizationId = session.user.organizationId;

        // Start transaction to update settlement and record status
        const result = await (prisma as any).$transaction(async (tx: any) => {
            // 0. Get record early to avoid redundant fetches and ensure it exists
            const record = await tx.record.findUnique({
                where: { id: params.id },
                include: { settlements: true }
            });

            if (!record) {
                throw new Error("Record not found");
            }

            // 1. Create settlement
            const settlement = await tx.recordSettlement.create({
                data: {
                    recordId: params.id,
                    settlementDate: new Date(data.settlementDate),
                    amountPaid: data.amountPaid,
                    paymentMode: data.paymentMode,
                    financialAccountId: data.financialAccountId,
                    remarks: data.remarks,
                    organizationId,
                    createdBy: session.user.id,
                }
            });

            // 2. If requested, convert to a Transaction
            let transactionId = null;
            if (data.convertToTransaction) {
                const transaction = await tx.transaction.create({
                    data: {
                        type: record.type, // income or expense
                        amount: data.amountPaid,
                        description: `Payment for Invoice ${record.invoiceNumber || ''}: ${data.remarks || ''}`,
                        date: new Date(data.settlementDate),
                        projectId: record.projectId,
                        ledgerId: record.ledgerId,
                        paymentMode: data.paymentMode,
                        financialAccountId: data.financialAccountId,
                        organizationId,
                        createdBy: session.user.id,
                        convertedFromRecordId: params.id,
                        approvalStatus: 'approved', // Payments usually auto-approved if ledger is approved? Or same as record.
                    }
                });
                transactionId = transaction.id;

                // Update settlement with transactionId
                await tx.recordSettlement.update({
                    where: { id: settlement.id },
                    data: { transactionId }
                });
            }

            // 3. Recalculate record totals
            // Add the current settlement to the calculation
            const allSettlements = [...record.settlements, settlement];
            const totalPaid = allSettlements.reduce((sum: number, s: any) => sum + s.amountPaid, 0);
            const balance = record.amount - totalPaid;

            let status = 'pending';
            if (totalPaid >= record.amount) {
                status = 'paid';
            } else if (totalPaid > 0) {
                status = 'partial';
            }

            const updatedRecord = await tx.record.update({
                where: { id: params.id },
                data: {
                    paidAmount: totalPaid,
                    balanceAmount: balance,
                    status
                }
            });

            return { settlement, record: updatedRecord };
        }, {
            maxWait: 10000, // 10s wait for connection
            timeout: 20000  // 20s execution timeout
        });

        return apiResponse.success(result, 201);
    } catch (error: unknown) {
        console.error("Settlement Error:", error);
        return apiResponse.internalError(error);
    }
}
