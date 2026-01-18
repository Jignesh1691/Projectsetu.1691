import { Transaction, Recordable } from './definitions';

/**
 * Gets the "effective" data for a transaction by considering its approval status.
 * Based on user requirements:
 * - If pending-create: returns null (should reflect after approval only).
 * - If rejected: returns null (invalidated data).
 * - If pending-edit: returns the ORIGINAL transaction data (new data reflects after approval only).
 * - If pending-delete: returns the ORIGINAL transaction data (stays in balance until approved).
 * - Otherwise (approved or null): returns the transaction as is.
 */
export function getEffectiveTransaction(t: Transaction): Transaction | null {
    if (t.approval_status === 'pending-create' || t.approval_status === 'rejected') {
        return null;
    }

    // For pending-edit or pending-delete, we return the original transaction as is.
    // We do NOT merge pending_data here because changes should only reflect after approval.
    return t;
}

/**
 * Gets the "effective" data for a recordable by considering its approval status.
 * (Consistent with Transaction logic above)
 */
export function getEffectiveRecordable(r: Recordable): Recordable | null {
    if (r.approval_status === 'pending-create' || r.approval_status === 'rejected') {
        return null;
    }

    return r;
}
