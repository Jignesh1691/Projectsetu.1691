import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { apiResponse, RecordSchema } from "@/lib/api-utils";
import { requiresApproval, canAccessProject } from "@/lib/permissions";
import { getFinancialYear } from "@/lib/utils";

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
        const createdBy = searchParams.get('createdBy');

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
        return apiResponse.unauthorized();
    }

    try {
        const json = await req.json();
        console.log("RECORDS POST: Received JSON:", JSON.stringify(json, null, 2));

        const validation = RecordSchema.safeParse(json);
        if (!validation.success) {
            console.error("RECORDS POST: Validation Failed:", validation.error.format());
            return apiResponse.error(validation.error.issues[0].message);
        }

        const {
            type, amount, description, dueDate, projectId, ledgerId, paymentMode,
            financialAccountId, status,
            invoiceNumber, invoiceDate, taxableAmount, cgstRate, cgstAmount,
            sgstRate, sgstAmount, igstRate, igstAmount, cessAmount,
            totalGstAmount, roundOffAmount
        } = validation.data;

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Project access check for non-admins
        if (userRole !== 'admin') {
            const projectUsers = await prisma.projectUser.findMany({
                where: { userId: session.user.id }
            });
            if (!canAccessProject(projectId, session.user.id, userRole, projectUsers as any)) {
                return apiResponse.forbidden("You don't have access to this project");
            }
        }

        // Determine approval status
        const approvalStatus = requiresApproval('record', 'create', userRole)
            ? 'pending-create'
            : 'approved';

        // Auto-generate Invoice Number for Sales (Income) if not provided
        let finalInvoiceNumber = invoiceNumber;
        if (type === 'income' && !finalInvoiceNumber) {
            const fy = getFinancialYear();
            const yearSuffix = `/${fy}`;

            // Get all income invoices for this organization in current FY to find max number
            const existingInvoices = await prisma.record.findMany({
                where: {
                    organizationId: session.user.organizationId as string,
                    type: 'income',
                    invoiceNumber: {
                        startsWith: 'INV-',
                        endsWith: yearSuffix,
                    }
                },
                select: { invoiceNumber: true }
            });

            let maxNum = 0;
            existingInvoices.forEach(inv => {
                if (inv.invoiceNumber) {
                    const match = inv.invoiceNumber.match(/INV-(\d+)\//);
                    if (match) {
                        const num = parseInt(match[1]);
                        if (num > maxNum) maxNum = num;
                    }
                }
            });

            finalInvoiceNumber = `INV-${maxNum + 1}${yearSuffix}`;
        }

        const record = await prisma.record.create({
            data: {
                type,
                amount,
                description,
                dueDate: new Date(dueDate),
                projectId,
                ledgerId,
                paymentMode: paymentMode || 'cash',
                financialAccountId: financialAccountId || undefined,
                status: status || 'pending',
                organizationId: session.user.organizationId as string,
                createdBy: session.user.id,
                approvalStatus,
                submittedBy: userRole === 'user' ? session.user.id : undefined,

                // GST Fields
                invoiceNumber: finalInvoiceNumber || undefined,
                invoiceDate: invoiceDate ? new Date(invoiceDate) : undefined,
                taxableAmount: taxableAmount || 0,
                cgstRate: cgstRate || 0,
                cgstAmount: cgstAmount || 0,
                sgstRate: sgstRate || 0,
                sgstAmount: sgstAmount || 0,
                igstRate: igstRate || 0,
                igstAmount: igstAmount || 0,
                cessAmount: cessAmount || 0,
                totalGstAmount: totalGstAmount || 0,
                roundOffAmount: roundOffAmount || 0,

                // Payment tracking
                paidAmount: 0,
                balanceAmount: amount,
            } as any,
        });

        return apiResponse.success(record, 201);
    } catch (error: unknown) {
        console.error("CRITICAL: Error creating record:", error);
        if (error instanceof Error) {
            console.error("Error Message:", error.message);
            console.error("Error Stack:", error.stack);
        }
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
        const { id, ...rest } = json;

        if (!id) return apiResponse.error("ID required");

        const validation = RecordSchema.partial().safeParse(rest);
        if (!validation.success) {
            return apiResponse.error(validation.error.issues[0].message);
        }

        const existing = await prisma.record.findUnique({ where: { id } });
        if (!existing || existing.organizationId !== session.user.organizationId) {
            return apiResponse.notFound("Record");
        }

        const userRole = (session.user.role?.toLowerCase() || 'user') as 'admin' | 'user';

        // Project access check for non-admins
        if (userRole !== 'admin') {
            const projectUsers = await prisma.projectUser.findMany({
                where: { userId: session.user.id }
            });
            // Check access to current project
            if (!canAccessProject(existing.projectId, session.user.id, userRole, projectUsers as any)) {
                return apiResponse.forbidden("You don't have access to this project");
            }
            // If changing project, check access to new project
            if (validation.data.projectId && validation.data.projectId !== existing.projectId) {
                if (!canAccessProject(validation.data.projectId, session.user.id, userRole, projectUsers as any)) {
                    return apiResponse.forbidden("You don't have access to the target project");
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
                    requestMessage: (json.requestMessage as string) || undefined,
                    pendingData: {
                        ...validation.data,
                        dueDate: validation.data.dueDate ? new Date(validation.data.dueDate) : undefined,
                        invoiceDate: validation.data.invoiceDate ? new Date(validation.data.invoiceDate) : undefined,
                    } as any,
                } as any
            });
            return apiResponse.success(updated);
        } else {
            // Admin or no approval required: Apply immediately
            const updatedRecordAmount = validation.data.amount !== undefined ? validation.data.amount : existing.amount;

            const updated = await prisma.record.update({
                where: { id },
                data: {
                    ...validation.data,
                    dueDate: validation.data.dueDate ? new Date(validation.data.dueDate) : undefined,
                    invoiceDate: validation.data.invoiceDate ? new Date(validation.data.invoiceDate) : undefined,
                    financialAccountId: validation.data.financialAccountId || undefined,
                    approvalStatus: 'approved',
                    // Recalculate balance if amount changed
                    balanceAmount: updatedRecordAmount - (existing.paidAmount || 0),
                } as any,
            });
            return apiResponse.success(updated);
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
