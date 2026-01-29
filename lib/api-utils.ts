import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Standard API Response Helper
 */
export const apiResponse = {
    success: (data: any, status = 200) =>
        NextResponse.json(data, { status }),

    error: (message: string, status = 400) =>
        NextResponse.json({ error: message }, { status }),

    unauthorized: () =>
        NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),

    forbidden: (message = "You don't have permission to perform this action") =>
        NextResponse.json({ error: message }, { status: 403 }),

    notFound: (item = 'Resource') =>
        NextResponse.json({ error: `${item} not found` }, { status: 404 }),

    internalError: (error: unknown) => {
        console.error('API Internal Error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json(
            { error: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal Server Error' },
            { status: 500 }
        );
    }
};

/**
 * Common Zod Schemas for API Validation
 */
export const TransactionSchema = z.object({
    type: z.enum(['income', 'expense']),
    amount: z.coerce.number().min(0.01),
    description: z.string().min(2),
    date: z.string().or(z.date()),
    projectId: z.string().optional().nullable(),
    ledgerId: z.string().optional().nullable(),
    paymentMode: z.enum(['cash', 'bank']),
    financialAccountId: z.string().optional().nullable(),
    billUrl: z.string().optional().nullable(),
    convertedFromRecordId: z.string().optional().nullable(),
    hajariSettlementId: z.string().optional().nullable(),
    requestMessage: z.string().optional().nullable(),
});

export const JournalEntrySchema = z.object({
    date: z.string().or(z.date()),
    amount: z.coerce.number().positive(),
    description: z.string().min(1),
    debitMode: z.string(),
    debitLedgerId: z.string().optional().nullable(),
    debitAccountId: z.string().optional().nullable(),
    creditMode: z.string(),
    creditLedgerId: z.string().optional().nullable(),
    creditAccountId: z.string().optional().nullable(),
    debitProjectId: z.string(),
    creditProjectId: z.string(),
    requestMessage: z.string().optional().nullable(),
});

export const ProjectSchema = z.object({
    name: z.string().min(2),
    location: z.string().optional().nullable(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD']).optional(),
    assigned_users: z.array(z.string()).optional(),
});

export const FinancialAccountSchema = z.object({
    name: z.string().min(2),
    type: z.enum(['CASH', 'BANK']),
    accountNumber: z.string().optional().nullable(),
    bankName: z.string().optional().nullable(),
    ifscCode: z.string().optional().nullable(),
    openingBalance: z.coerce.number().default(0),
});

export const LedgerSchema = z.object({
    name: z.string().min(2),
    type: z.enum(['income', 'expense']).optional().nullable(),
    gstNumber: z.string().optional().nullable(),
    isGstRegistered: z.boolean().default(false),
    billingAddress: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
});

export const RecordSchema = z.object({
    type: z.enum(['income', 'expense']),
    amount: z.coerce.number().min(0.01),
    description: z.string().min(2),
    dueDate: z.string().or(z.date()),
    projectId: z.string(),
    ledgerId: z.string(),
    paymentMode: z.enum(['cash', 'bank']),
    financialAccountId: z.string().optional().nullable(),
    billUrl: z.string().optional().nullable(),
    status: z.enum(['pending', 'partial', 'paid']).default('pending'),

    // GST Fields
    invoiceNumber: z.string().optional().nullable(),
    invoiceDate: z.string().or(z.date()).optional().nullable(),
    taxableAmount: z.coerce.number().optional().nullable(),
    cgstRate: z.coerce.number().optional().nullable(),
    cgstAmount: z.coerce.number().optional().nullable(),
    sgstRate: z.coerce.number().optional().nullable(),
    sgstAmount: z.coerce.number().optional().nullable(),
    igstRate: z.coerce.number().optional().nullable(),
    igstAmount: z.coerce.number().optional().nullable(),
    cessAmount: z.coerce.number().optional().nullable(),
    totalGstAmount: z.coerce.number().optional().nullable(),
    roundOffAmount: z.coerce.number().optional().nullable(),
});

export const RecordSettlementSchema = z.object({
    recordId: z.string(),
    settlementDate: z.string().or(z.date()),
    amountPaid: z.coerce.number().positive(),
    paymentMode: z.enum(['cash', 'bank']),
    financialAccountId: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
    convertToTransaction: z.boolean().default(false),
});
