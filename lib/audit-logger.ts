import { prisma } from "@/lib/prisma";

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SUBMIT';
export type AuditEntity = 'JOURNAL' | 'TRANSACTION' | 'RECORD' | 'HAJARI' | 'TASK' | 'MATERIAL' | 'LEDGER';

interface LogActionParams {
    action: AuditAction;
    entity: AuditEntity;
    entityId: string;
    details: string;
    organizationId: string;
    userId: string;
    metadata?: any;
}

export async function logAction({
    action,
    entity,
    entityId,
    details,
    organizationId,
    userId,
    metadata
}: LogActionParams) {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                entity,
                entityId,
                details,
                organizationId,
                userId,
                metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined
            }
        });
    } catch (error) {
        // Silently fail logging to avoid blocking main operation
        // In production, we might want to log this to stderr
        console.error("Failed to create audit log:", error);
    }
}
