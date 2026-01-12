'use client';

import { updateState } from './state-manager';
import { mapModelToStore } from './core';
import { ensureSalaryHajariLedger, addTransaction } from './finances';
import { Labor, Hajari, Transaction, User, PaymentMode } from '../definitions';

// --- Labors ---
export const addLabor = async (data: Omit<Labor, 'id'>, currentUser: User) => {
    try {
        const response = await fetch('/api/labors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to add labor");
        const newLabor = await response.json();
        updateState(prev => ({ ...prev, labors: [...prev.labors, newLabor] }));
    } catch (error) {
        console.error("Error adding labor:", error);
        throw error;
    }
};

export const editLabor = async (id: string, data: Partial<Labor>) => {
    try {
        const response = await fetch('/api/labors', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...data }),
        });
        if (!response.ok) throw new Error("Failed to update labor");
        const updatedLabor = await response.json();
        updateState(prev => ({
            ...prev,
            labors: prev.labors.map((l: Labor) => l.id === id ? updatedLabor : l)
        }));
    } catch (error) {
        console.error("Error editing labor:", error);
        throw error;
    }
};

export const deleteLabor = async (id: string) => {
    try {
        const response = await fetch(`/api/labors?id=${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error("Failed to delete labor");
        updateState(prev => ({
            ...prev,
            labors: prev.labors.filter((l: Labor) => l.id !== id),
            hajari_records: prev.hajari_records.filter((h: Hajari) => h.labor_id !== id),
        }));
    } catch (error) {
        console.error("Error deleting labor:", error);
        throw error;
    }
};

// --- Hajari ---
export const saveHajariRecords = async (records: Hajari[], currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/hajari', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                records: records.map(r => ({
                    ...r,
                    date: r.date,
                    status: r.status,
                    overtimeHours: r.overtime_hours,
                    upad: r.upad,
                    laborId: r.labor_id,
                    projectId: r.project_id
                })),
                requestMessage: currentUser.role === 'admin' ? undefined : requestMessage
            }),
        });

        if (!response.ok) throw new Error("Failed to save hajari records");

        updateState(prev => {
            const otherRecords = prev.hajari_records.filter((r: Hajari) =>
                !records.some(newR => newR.id === r.id)
            );
            return {
                ...prev,
                hajari_records: [...otherRecords, ...records]
            };
        });
    } catch (error) {
        console.error("Error saving hajari records:", error);
        throw error;
    }
};

interface SettleHajariData {
    labor: Labor;
    year: number;
    month: number;
    amount: number;
    payment_mode: PaymentMode;
    settlementDate: Date;
}
export const settleHajari = async (data: SettleHajariData & { projectId?: string }, currentUser: User, requestMessage?: string) => {
    try {
        const userRole = (currentUser.role || 'user').toLowerCase();
        const settlementStatus = userRole === 'admin' ? 'settlement' : 'pending-settlement';
        const settlementDate = new Date(data.year, data.month, 1).toISOString();
        const response = await fetch('/api/hajari', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: settlementDate,
                status: settlementStatus,
                overtimeHours: 0,
                upad: data.amount,
                laborId: data.labor.id,
                projectId: data.projectId || '',
                requestMessage
            }),
        });

        if (!response.ok) throw new Error("Failed to settle hajari");

        const newHajari = await response.json();
        const mappedHajari = mapModelToStore('hajari', newHajari);

        if (mappedHajari.status === 'settlement') {
            const ledgerId = await ensureSalaryHajariLedger(currentUser);
            if (ledgerId) {
                await addTransaction({
                    type: 'expense',
                    amount: data.amount,
                    description: `Hajari Payout: ${data.labor.name} (${data.month + 1}/${data.year})`,
                    date: new Date().toISOString(),
                    project_id: data.projectId || '',
                    ledger_id: ledgerId,
                    payment_mode: data.payment_mode,
                    hajari_settlement_id: mappedHajari.id
                } as any, currentUser);
            }
        }

        updateState(prev => ({
            ...prev,
            hajari_records: [...prev.hajari_records, mappedHajari]
        }));
    } catch (error) {
        console.error("Error settling hajari:", error);
        throw error;
    }
};

export const revertHajariTransaction = async (transaction: Transaction, currentUser: User, requestMessage?: string) => {
    if (!transaction.hajari_settlement_id) return;
    try {
        const transResponse = await fetch(`/api/transactions?id=${transaction.id}&revert=true`, {
            method: 'DELETE',
        });
        if (!transResponse.ok) throw new Error("Failed to delete transaction for revert");

        const hajariResponse = await fetch(`/api/hajari?id=${transaction.hajari_settlement_id}`, {
            method: 'DELETE',
        });
        if (!hajariResponse.ok) throw new Error("Failed to delete hajari settlement record");

        updateState(prev => ({
            ...prev,
            transactions: prev.transactions.filter((t: Transaction) => t.id !== transaction.id),
            hajari_records: prev.hajari_records.filter((h: Hajari) => h.id !== transaction.hajari_settlement_id)
        }));
    } catch (error) {
        console.error("Error reverting hajari transaction:", error);
        throw error;
    }
}
