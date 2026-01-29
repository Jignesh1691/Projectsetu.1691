'use client';

import { updateState } from './state-manager';
import { mapModelToStore, initializeStore } from './core';
import { Transaction, Recordable, RecordSettlement, Ledger, User, PaymentMode, FinancialAccount } from '../definitions';

export const SALARY_HAJARI_LEDGER = 'Salary/Hajari';

export const ensureSalaryHajariLedger = async (currentUser: User) => {
    let state: any;
    updateState(s => { state = s; return s; });

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

// --- Ledgers ---
export const addLedger = async (ledgerData: Omit<Ledger, 'id' | 'approval_status' | 'pending_data' | 'rejection_count'>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/ledgers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...ledgerData,
                gstNumber: ledgerData.gst_number,
                isGstRegistered: ledgerData.is_gst_registered,
                billingAddress: ledgerData.billing_address,
                state: ledgerData.state,
                requestMessage
            }),
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
            body: JSON.stringify({
                id,
                ...ledgerData,
                gstNumber: ledgerData.gst_number,
                isGstRegistered: ledgerData.is_gst_registered,
                billingAddress: ledgerData.billing_address,
                state: ledgerData.state,
                requestMessage
            }),
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
                financialAccountId: data.financial_account_id,
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
                financialAccountId: data.financial_account_id,
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
                financialAccountId: data.financial_account_id,
                billUrl: data.bill_url,
                invoiceNumber: data.invoice_number,
                invoiceDate: data.invoice_date,
                taxableAmount: data.taxable_amount,
                cgstRate: data.cgst_rate,
                cgstAmount: data.cgst_amount,
                sgstRate: data.sgst_rate,
                sgstAmount: data.sgst_amount,
                igstRate: data.igst_rate,
                igstAmount: data.igst_amount,
                cessAmount: data.cess_amount,
                totalGstAmount: data.total_gst_amount,
                roundOffAmount: data.round_off_amount,
                requestMessage
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = "Failed to add record";
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            console.error("API Error adding record:", errorMessage);
            throw new Error(errorMessage);
        }

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
                financialAccountId: data.financial_account_id,
                billUrl: data.bill_url,
                invoiceNumber: data.invoice_number,
                invoiceDate: data.invoice_date,
                taxableAmount: data.taxable_amount,
                cgstRate: data.cgst_rate,
                cgstAmount: data.cgst_amount,
                sgstRate: data.sgst_rate,
                sgstAmount: data.sgst_amount,
                igstRate: data.igst_rate,
                igstAmount: data.igst_amount,
                cessAmount: data.cess_amount,
                totalGstAmount: data.total_gst_amount,
                roundOffAmount: data.round_off_amount,
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
            type: record.type === 'income' ? 'income' : 'expense',
            amount: record.amount,
            description: `Converted: ${record.description}`,
            date: new Date().toISOString(),
            project_id: record.project_id,
            ledger_id: record.ledger_id,
            payment_mode: record.payment_mode,
            financial_account_id: record.financial_account_id,
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
                financialAccountId: transactionData.financial_account_id,
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

export const addRecordSettlement = async (recordId: string, data: any) => {
    try {
        const response = await fetch(`/api/records/${recordId}/settlements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                settlementDate: data.settlement_date,
                amountPaid: data.amount_paid,
                paymentMode: data.payment_mode,
                financialAccountId: data.financial_account_id,
                remarks: data.remarks,
                convertToTransaction: !!data.convert_to_transaction,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to add settlement");
        }

        const result = await response.json();
        const mappedRecord = mapModelToStore('recordable', result.record);

        updateState(prev => {
            const recordIndex = prev.recordables.findIndex((r: Recordable) => r.id === recordId);
            if (recordIndex === -1) return prev;

            const updatedRecordables = [...prev.recordables];
            updatedRecordables[recordIndex] = mappedRecord;

            return {
                ...prev,
                recordables: updatedRecordables,
            };
        });

        // If converted to transaction, we might want to refresh transactions
        if (data.convert_to_transaction) {
            fetch('/api/transactions')
                .then(res => res.json())
                .then(transactions => {
                    updateState(prev => ({
                        ...prev,
                        transactions: Array.isArray(transactions)
                            ? transactions.map((t: any) => mapModelToStore('transaction', t))
                            : prev.transactions
                    }));
                });
        }

        return result;
    } catch (error) {
        console.error("Error adding record settlement:", error);
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

export interface QuickEntryItem {
    entryType: 'transaction' | 'recordable';
    type: 'income' | 'expense';
    amount: number;
    description: string;
    date: Date;
    project_id: string;
    ledger_id: string;
    payment_mode: 'cash' | 'bank';
    financial_account_id?: string;
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
                financialAccountId: item.financial_account_id,
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

export const addFinancialAccount = async (data: Omit<FinancialAccount, 'id'>, currentUser: User) => {
    try {
        const response = await fetch('/api/financial-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create account");
        }

        const newAccount = await response.json();
        updateState(prev => ({ ...prev, financial_accounts: [...prev.financial_accounts, newAccount] }));
        return newAccount;
    } catch (error) {
        console.error("Error adding financial account:", error);
        throw error;
    }
};

export const editFinancialAccount = async (id: string, data: Partial<FinancialAccount>, currentUser: User) => {
    try {
        const response = await fetch('/api/financial-accounts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...data }),
        });

        if (!response.ok) throw new Error("Failed to update account");

        const updatedAccount = await response.json();

        updateState(prev => {
            const index = prev.financial_accounts.findIndex((a: FinancialAccount) => a.id === id);
            if (index === -1) return prev;
            const updated = [...prev.financial_accounts];
            updated[index] = updatedAccount;
            return { ...prev, financial_accounts: updated };
        });
    } catch (error) {
        console.error("Error editing financial account:", error);
        throw error;
    }
};
