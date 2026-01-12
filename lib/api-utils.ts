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
    amount: z.coerce.number().positive(),
    description: z.string().min(1),
    date: z.string().or(z.date()),
    projectId: z.string(),
    ledgerId: z.string(),
    paymentMode: z.enum(['cash', 'bank']).default('cash'),
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
    creditMode: z.string(),
    creditLedgerId: z.string().optional().nullable(),
    debitProjectId: z.string(),
    creditProjectId: z.string(),
    requestMessage: z.string().optional().nullable(),
});

export const ProjectSchema = z.object({
    name: z.string().min(2),
    location: z.string().optional().nullable(),
    assigned_users: z.array(z.string()).optional(),
});
