export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse } from "@/lib/api-utils";

export async function GET(req: Request) {
    try {
        const session = await auth();

        if (!session || session.user.role?.toUpperCase() !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizationId = session.user.organizationId;

        // Fetch pending items from all approvable models
        const [
            ledgers,
            transactions,
            records,
            hajari,
            tasks,
            materials,
            materialLedgers,
            photos,
            documents
        ] = await Promise.all([
            prisma.ledger.findMany({ where: { organizationId, approvalStatus: { startsWith: 'pending' } } }),
            prisma.transaction.findMany({ where: { organizationId, approvalStatus: { startsWith: 'pending' } } }),
            prisma.record.findMany({ where: { organizationId, approvalStatus: { startsWith: 'pending' } } }),
            prisma.hajari.findMany({ where: { organizationId, approvalStatus: { startsWith: 'pending' } } }),
            prisma.task.findMany({ where: { organizationId, approvalStatus: { startsWith: 'pending' } } }),
            prisma.material.findMany({ where: { organizationId, approvalStatus: { startsWith: 'pending' } } }),
            prisma.materialLedger.findMany({ where: { organizationId, approvalStatus: { startsWith: 'pending' } } }),
            prisma.photo.findMany({ where: { organizationId, approvalStatus: { startsWith: 'pending' } } }),
            prisma.document.findMany({ where: { organizationId, approvalStatus: { startsWith: 'pending' } } }),
        ]);

        return NextResponse.json({
            ledgers,
            transactions,
            records,
            hajari,
            tasks,
            materials,
            materialLedgers,
            photos,
            documents
        });
    } catch (error: unknown) {
        console.error("Error fetching approvals:", error);
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || session.user.role?.toUpperCase() !== "ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, module, status, remarks } = await req.json();

        if (!id || !module || !status) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const organizationId = session.user.organizationId;

        // Map module to prisma model
        const modelMap: Record<string, any> = {
            ledger: prisma.ledger,
            transaction: prisma.transaction,
            record: prisma.record,
            recordable: prisma.record,
            hajari: prisma.hajari,
            task: prisma.task,
            material: prisma.material,
            materialledger: prisma.materialLedger,
            materialledgerentry: prisma.materialLedger,
            photo: prisma.photo,
            document: prisma.document,
        };

        const model = modelMap[module.toLowerCase()];
        if (!model) {
            return NextResponse.json({ error: "Invalid module" }, { status: 400 });
        }

        const item = await model.findUnique({ where: { id } });

        if (!item || item.organizationId !== organizationId) {
            return NextResponse.json({ error: "Item not found" }, { status: 404 });
        }

        if (status === 'approved') {
            if (item.approvalStatus === 'pending-delete') {
                await model.delete({ where: { id } });
                return NextResponse.json({ success: true, action: 'deleted' });
            } else if (item.approvalStatus === 'pending-edit' && item.pendingData) {
                // Apply pending changes
                const updated = await model.update({
                    where: { id },
                    data: {
                        ...(item.pendingData as any),
                        approvalStatus: 'approved',
                        pendingData: null,
                        remarks: remarks || null,
                    }
                });
                return NextResponse.json({ success: true, action: 'edited', data: updated });
            } else {
                // For pending-create or other cases, just mark as approved
                const updated = await model.update({
                    where: { id },
                    data: {
                        approvalStatus: 'approved',
                        remarks: remarks || null,
                    }
                });
                return NextResponse.json({ success: true, action: 'approved', data: updated });
            }
        } else if (status === 'rejected') {
            const updated = await model.update({
                where: { id },
                data: {
                    approvalStatus: 'rejected',
                    remarks: remarks || null,
                    rejectionCount: (item.rejectionCount || 0) + 1,
                }
            });
            return NextResponse.json({ success: true, action: 'rejected', data: updated });
        }

        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    } catch (error: unknown) {
        console.error("Error processing approval:", error);
        return apiResponse.internalError(error);
    }
}
