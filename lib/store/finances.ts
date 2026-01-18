'use client';

import { updateState, getCurrentState } from './state-manager';
import { mapModelToStore, initializeStore } from './core';
import { Transaction, Recordable, Ledger, User, PaymentMode } from '../definitions';

export const SALARY_HAJARI_LEDGER = 'Salary/Hajari';
export const PETTY_CASH_LEDGER = 'Petty Cash';

export const ensureSalaryHajariLedger = async (currentUser: User) => {
    const state = getCurrentState();

    if (!state || !state.ledgers) return null;

    let ledger = state.ledgers.find((l: any) => l.name === SALARY_HAJARI_LEDGER);
    if (ledger) return ledger.id;

    try {
        const response = await fetch('/api/ledgers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: SALARY_HAJARI_LEDGER }),
        });
        if (response.ok) {
            const newLedger = await response.json();
            updateState(prev => ({ ...prev, ledgers: [newLedger, ...prev.ledgers] }));
            return newLedger.id;
        }
    } catch (error) {
        console.error("Error ensuring Salary/Hajari ledger:", error);
    }
    return null;
};

export const ensurePettyCashLedger = async (currentUser: User) => {
    let state = getCurrentState();

    const ledgerName = `${currentUser.name} Petty Cash`;

    // 1. Check local state first
    if (state?.ledgers) {
        let ledger = state.ledgers.find((l: any) => l.name === ledgerName);
        if (ledger) return ledger.id;
    }

    // 2. If not found locally, fetch fresh list from API
    try {
        const response = await fetch('/api/ledgers');
        if (response.ok) {
            const allLedgers = await response.json();
            // Update store
            updateState((prev) => ({ ...prev, ledgers: allLedgers }));

            // Check again within fresh list
            const ledger = allLedgers.find((l: any) => l.name === ledgerName);
            if (ledger) return ledger.id;
        }
    } catch (e) {
        console.error("Failed to sync ledgers:", e);
    }

    // 3. If still not found, create it
    try {
        const response = await fetch('/api/ledgers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: ledgerName }),
        });

        if (response.ok) {
            const newLedger = await response.json();
            updateState(prev => ({ ...prev, ledgers: [newLedger, ...prev.ledgers] }));
            return newLedger.id;
        } else {
            const errorData = await response.json();
            console.error(`Failed to create ${ledgerName} ledger:`, errorData);
        }
    } catch (error) {
        console.error(`Error ensuring ${ledgerName} ledger:`, error);
    }
    return null;
};

// --- Ledgers ---
export const addLedger = async (ledgerData: Omit<Ledger, 'id' | 'approval_status' | 'pending_data' | 'rejection_count'>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/ledgers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...ledgerData, requestMessage }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create ledger");
        }

        const newLedger = await response.json();
        const mappedLedger = mapModelToStore('ledger', newLedger);
        updateState(prev => ({ ...prev, ledgers: [mappedLedger, ...prev.ledgers] }));
        return mappedLedger;
    } catch (error) {
        console.error("Error adding ledger:", error);
        throw error;
    }
};

export const editLedger = async (id: string, ledgerData: Partial<Ledger>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/ledgers', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...ledgerData, requestMessage }),
        });

        if (!response.ok) throw new Error("Failed to update ledger");

        const updatedLedger = await response.json();
        const mappedLedger = mapModelToStore('ledger', updatedLedger);

        updateState(prev => {
            const ledgerIndex = prev.ledgers.findIndex((l: Ledger) => l.id === id);
            if (ledgerIndex === -1) return prev;
            const updatedLedgers = [...prev.ledgers];
            updatedLedgers[ledgerIndex] = mappedLedger;
            return { ...prev, ledgers: updatedLedgers };
        });
    } catch (error) {
        console.error("Error editing ledger:", error);
        throw error;
    }
};

export const deleteLedger = async (id: string, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch(`/api/ledgers?id=${id}${requestMessage ? `&message=${encodeURIComponent(requestMessage)}` : ''}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error("Failed to delete ledger");
        const result = await response.json();

        updateState(prev => {
            if (result.status === 'pending-delete') {
                const mappedLedger = mapModelToStore('ledger', result.ledger || result.data);
                return {
                    ...prev,
                    ledgers: prev.ledgers.map((l: Ledger) => l.id === id ? mappedLedger : l)
                };
            }
            return {
                ...prev,
                ledgers: prev.ledgers.filter((l: Ledger) => l.id !== id),
                transactions: prev.transactions.filter((t: Transaction) => t.ledger_id !== id),
                recordables: prev.recordables.filter((r: Recordable) => r.ledger_id !== id),
            };
        });
    } catch (error) {
        console.error("Error deleting ledger:", error);
        throw error;
    }
};

// --- Transactions ---
export const addTransaction = async (data: Omit<Transaction, 'id' | 'approval_status' | 'rejection_count'>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...data,
                projectId: data.project_id,
                ledgerId: data.ledger_id,
                paymentMode: data.payment_mode,
                billUrl: data.bill_url,
                requestMessage
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create transaction");
        }

        const newTransaction = await response.json();
        const mappedTransaction = mapModelToStore('transaction', newTransaction);
        updateState(prev => ({ ...prev, transactions: [mappedTransaction, ...prev.transactions] }));
    } catch (error) {
        console.error("Error adding transaction:", error);
        throw error;
    }
};

export const editTransaction = async (id: string, data: Partial<Transaction>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/transactions', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                ...data,
                projectId: data.project_id,
                ledgerId: data.ledger_id,
                paymentMode: data.payment_mode,
                billUrl: data.bill_url,
                requestMessage
            }),
        });

        if (!response.ok) throw new Error("Failed to update transaction");

        const updatedTransaction = await response.json();
        const mappedTransaction = mapModelToStore('transaction', updatedTransaction);

        updateState(prev => {
            const index = prev.transactions.findIndex((t: Transaction) => t.id === id);
            if (index === -1) return prev;
            const updated = [...prev.transactions];
            updated[index] = mappedTransaction;
            return { ...prev, transactions: updated };
        });
    } catch (error) {
        console.error("Error editing transaction:", error);
        throw error;
    }
};

export const deleteTransaction = async (id: string, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch(`/api/transactions?id=${id}${requestMessage ? `&message=${encodeURIComponent(requestMessage)}` : ''}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error("Failed to delete transaction");
        const result = await response.json();

        updateState(prev => {
            if (result.status === 'pending-delete') {
                const mappedTransaction = mapModelToStore('transaction', result.transaction || result.data);
                return {
                    ...prev,
                    transactions: prev.transactions.map((t: Transaction) => t.id === id ? mappedTransaction : t)
                };
            }
            return { ...prev, transactions: prev.transactions.filter((t: Transaction) => t.id !== id) };
        });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        throw error;
    }
};

// --- Recordables ---
export const addRecordable = async (data: Omit<Recordable, 'id' | 'approval_status' | 'rejection_count'>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...data,
                projectId: data.project_id,
                ledgerId: data.ledger_id,
                dueDate: data.due_date,
                paymentMode: data.payment_mode,
                billUrl: data.bill_url,
                requestMessage
            }),
        });

        if (!response.ok) throw new Error("Failed to add record");

        const newRecord = await response.json();
        const mappedRecord = mapModelToStore('recordable', newRecord);
        updateState(prev => ({ ...prev, recordables: [...prev.recordables, mappedRecord] }));
    } catch (error) {
        console.error("Error adding recordable:", error);
        throw error;
    }
};

export const editRecordable = async (id: string, data: Partial<Recordable>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/records', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                ...data,
                projectId: data.project_id,
                ledgerId: data.ledger_id,
                dueDate: data.due_date,
                paymentMode: data.payment_mode,
                billUrl: data.bill_url,
                requestMessage
            }),
        });

        if (!response.ok) throw new Error("Failed to update record");

        const updatedRecord = await response.json();
        const mappedRecord = mapModelToStore('recordable', updatedRecord);

        updateState(prev => {
            const index = prev.recordables.findIndex((r: Recordable) => r.id === id);
            if (index === -1) return prev;
            const updated = [...prev.recordables];
            updated[index] = mappedRecord;
            return { ...prev, recordables: updated };
        });
    } catch (error) {
        console.error("Error editing recordable:", error);
        throw error;
    }
};

export const deleteRecordable = async (id: string, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch(`/api/records?id=${id}${requestMessage ? `&message=${encodeURIComponent(requestMessage)}` : ''}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error("Failed to delete record");
        const result = await response.json();

        updateState(prev => {
            if (result.status === 'pending-delete') {
                const mappedRecord = mapModelToStore('recordable', result.record || result.data);
                return {
                    ...prev,
                    recordables: prev.recordables.map((r: Recordable) => r.id === id ? mappedRecord : r)
                };
            }
            return { ...prev, recordables: prev.recordables.filter((r: Recordable) => r.id !== id) };
        });
    } catch (error) {
        console.error("Error deleting recordable:", error);
        throw error;
    }
};

export const convertRecordable = async (record: Recordable) => {
    try {
        const transactionData: any = {
            type: record.type === 'asset' ? 'income' : 'expense',
            amount: record.amount,
            description: `Converted: ${record.description}`,
            date: new Date().toISOString(),
            project_id: record.project_id,
            ledger_id: record.ledger_id,
            payment_mode: record.payment_mode,
            bill_url: record.bill_url,
            converted_from_record_id: record.id,
        };

        const transResponse = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...transactionData,
                projectId: transactionData.project_id,
                ledgerId: transactionData.ledger_id,
                paymentMode: transactionData.payment_mode,
                convertedFromRecordId: transactionData.converted_from_record_id,
            }),
        });

        if (!transResponse.ok) throw new Error("Failed to create transaction for conversion");
        const newTrans = await transResponse.json();
        const mappedTrans = mapModelToStore('transaction', newTrans);

        const recordResponse = await fetch('/api/records', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: record.id, status: 'paid' }),
        });

        if (!recordResponse.ok) throw new Error("Failed to update record status to paid");
        const updatedRecord = await recordResponse.json();
        const mappedRecord = mapModelToStore('recordable', updatedRecord);

        updateState(prev => {
            const recordIndex = prev.recordables.findIndex((r: Recordable) => r.id === record.id);
            if (recordIndex === -1) return prev;
            const updatedRecordables = [...prev.recordables];
            updatedRecordables[recordIndex] = mappedRecord;
            return {
                ...prev,
                recordables: updatedRecordables,
                transactions: [...prev.transactions, mappedTrans]
            };
        });
    } catch (error) {
        console.error("Error converting recordable:", error);
        throw error;
    }
};

export const revertConvertedTransaction = async (transaction: Transaction) => {
    if (!transaction.converted_from_record_id) return;
    try {
        const recordResponse = await fetch('/api/records', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: transaction.converted_from_record_id, status: 'pending' }),
        });

        if (!recordResponse.ok) throw new Error("Failed to revert record status");
        const updatedRecord = await recordResponse.json();
        const mappedRecord = mapModelToStore('recordable', updatedRecord);

        const transResponse = await fetch(`/api/transactions?id=${transaction.id}&revert=true`, {
            method: 'DELETE',
        });
        if (!transResponse.ok) throw new Error("Failed to delete transaction during revert");

        updateState(prev => {
            const recordIndex = prev.recordables.findIndex((r: Recordable) => r.id === transaction.converted_from_record_id);
            if (recordIndex === -1) return prev;
            const updatedRecordables = [...prev.recordables];
            updatedRecordables[recordIndex] = mappedRecord;
            return {
                ...prev,
                transactions: prev.transactions.filter((t: Transaction) => t.id !== transaction.id),
                recordables: updatedRecordables
            };
        });
    } catch (error) {
        console.error("Error reverting converted transaction:", error);
        throw error;
    }
};

// --- Quick Entry ---
export interface QuickEntryItem {
    entryType: 'transaction' | 'recordable';
    type: 'income' | 'expense' | 'asset' | 'liability';
    amount: number;
    description: string;
    date: Date;
    project_id: string;
    ledger_id: string;
    payment_mode: 'cash' | 'bank';
}

export const addMultipleItems = async (items: QuickEntryItem[], currentUser: User, requestMessage?: string) => {
    try {
        const results: any[] = [];
        for (const item of items) {
            const isTransaction = item.entryType === 'transaction';
            const endpoint = isTransaction ? '/api/transactions' : '/api/records';

            const body: any = {
                type: item.type,
                amount: item.amount,
                description: item.description,
                projectId: item.project_id,
                ledgerId: item.ledger_id,
                paymentMode: item.payment_mode,
                date: item.date instanceof Date ? item.date.toISOString() : (item.date as string),
                requestMessage,
            };

            if (!isTransaction) {
                body.dueDate = body.date;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const data = await response.json();
                results.push({ type: item.entryType, data: mapModelToStore(item.entryType, data) });
            }
        }

        updateState(prev => {
            const newTransactions = [...prev.transactions];
            const newRecords = [...prev.recordables];
            results.forEach(res => {
                if (res.type === 'transaction') {
                    newTransactions.unshift(res.data);
                } else {
                    newRecords.unshift(res.data);
                }
            });
            return {
                ...prev,
                transactions: newTransactions,
                recordables: newRecords,
            };
        });
    } catch (error) {
        console.error("Error adding multiple items:", error);
        throw error;
    }
};
export const fetchMoreTransactions = async () => {
    const state = getCurrentState();
    if (!state || !state.has_more_transactions) return;

    const nextPage = state.transaction_page + 1;
    const limit = 50; // Use smaller pages for incremental loading

    try {
        const response = await fetch(`/api/transactions?page=${nextPage}&limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch more transactions");

        const data = await response.json();
        const mapped = data.map((t: any) => mapModelToStore('transaction', t));

        updateState(prev => ({
            ...prev,
            transactions: [...prev.transactions, ...mapped],
            transaction_page: nextPage,
            has_more_transactions: mapped.length === limit
        }));
    } catch (error) {
        console.error("Error fetching more transactions:", error);
    }
};

export const fetchMoreRecords = async () => {
    const state = getCurrentState();
    if (!state || !state.has_more_records) return;

    const nextPage = state.record_page + 1;
    const limit = 50;

    try {
        const response = await fetch(`/api/records?page=${nextPage}&limit=${limit}`);
        if (!response.ok) throw new Error("Failed to fetch more records");

        const data = await response.json();
        const mapped = data.map((r: any) => mapModelToStore('recordable', r));

        updateState(prev => ({
            ...prev,
            recordables: [...prev.recordables, ...mapped],
            record_page: nextPage,
            has_more_records: mapped.length === limit
        }));
    } catch (error) {
        console.error("Error fetching more records:", error);
    }
};
