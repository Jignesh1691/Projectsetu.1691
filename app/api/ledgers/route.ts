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

        const ledgers = await prisma.ledger.findMany({
            where: {
                organizationId: session.user.organizationId as string,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                _count: {
                    select: { transactions: true }
                }
            }
        });

        return NextResponse.json(ledgers);
    } catch (error: unknown) {
        console.error("Error fetching ledgers:", error);
        return apiResponse.internalError(error);
    }
}

export async function POST(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { name, requestMessage } = await req.json();

        if (!name) {
            return NextResponse.json({ error: "Ledger name is required" }, { status: 400 });
        }

        const organizationId = session.user.organizationId;
        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        const existingLedger = await prisma.ledger.findUnique({
            where: {
                organizationId_name: {
                    organizationId: organizationId as string,
                    name,
                }
            }
        });

        if (existingLedger) {
            return NextResponse.json({ error: "A ledger with this name already exists" }, { status: 400 });
        }

        // Determine approval status
        const approvalStatus = requiresApproval('ledger', 'create', userRole)
            ? 'pending-create'
            : 'approved';

        const ledger = await prisma.ledger.create({
            data: {
                name,
                organizationId: organizationId as string,
                approvalStatus,
                submittedBy: userRole === 'user' ? session.user.id : undefined,
                requestMessage: userRole === 'user' ? requestMessage : undefined,
                rejectionCount: 0,
            },
        });

        return NextResponse.json(ledger);
    } catch (error: unknown) {
        console.error("Error creating ledger:", error);
        return apiResponse.internalError(error);
    }
}

export async function PUT(req: Request) {
    const session = await auth();

    if (!session || !session.user.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id, name, requestMessage } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Ledger ID is required" }, { status: 400 });
        }

        const ledger = await prisma.ledger.findUnique({
            where: { id },
        });

        if (!ledger || ledger.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Ledger not found or unauthorized" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Check if approval is required
        if (requiresApproval('ledger', 'edit', userRole)) {
            // User: Create pending edit request
            const updated = await prisma.ledger.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-edit',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage,
                    pendingData: {
                        name,
                    } as any,
                }
            });
            return NextResponse.json(updated);
        } else {
            // Admin or no approval required: Apply immediately
            const updatedLedger = await prisma.ledger.update({
                where: { id },
                data: {
                    name,
                    approvalStatus: 'approved',
                },
            });
            return NextResponse.json(updatedLedger);
        }
    } catch (error: unknown) {
        console.error("Error updating ledger:", error);
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

        if (!id) {
            return NextResponse.json({ error: "Ledger ID is required" }, { status: 400 });
        }

        const ledger = await prisma.ledger.findUnique({
            where: { id },
        });

        if (!ledger || ledger.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Ledger not found or unauthorized" }, { status: 404 });
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        if (requiresApproval('ledger', 'delete', userRole)) {
            // User: Mark for pending deletion
            const updated = await prisma.ledger.update({
                where: { id },
                data: {
                    approvalStatus: 'pending-delete',
                    submittedBy: session.user.id,
                    requestMessage: requestMessage || undefined,
                }
            });
            return NextResponse.json({ success: true, status: 'pending-delete', ledger: updated });
        } else {
            // Admin: Delete immediately
            await prisma.ledger.delete({
                where: { id },
            });
            return NextResponse.json({ success: true });
        }
    } catch (error: unknown) {
        console.error("Error deleting ledger:", error);
        return apiResponse.internalError(error);
    }
}
