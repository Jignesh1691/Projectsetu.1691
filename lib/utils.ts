

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Transaction, Recordable, PaymentMode, RecordType, RecordStatus } from "./definitions";
import type { DateRange } from "react-day-picker";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, pdfExport = false) {
  // We no longer strip the sign.
  // Unless specifically requested otherwise, we show standard currency formatting.

  if (pdfExport) {
    // For PDF, we just want the number but formatted with commas.
    // If negative, it should show -1,234.00
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    // We remove explicit 'signDisplay: never' so default behavior (showing - for negative) applies.
  }).format(amount);
}

type FilterOptions = {
  project_id?: string;
  ledger_id?: string;
  created_by?: string;
  dateRange?: DateRange;
  payment_mode?: PaymentMode;
  type?: RecordType;
  status?: RecordStatus;
}

export function filterTransactions(
  transactions: Transaction[],
  filters: FilterOptions
): Transaction[] {
  return transactions.filter((transaction) => {
    const projectMatch = filters.project_id
      ? transaction.project_id === filters.project_id
      : true;
    const ledgerMatch = filters.ledger_id
      ? transaction.ledger_id === filters.ledger_id
      : true;
    const userMatch = filters.created_by
      ? transaction.created_by === filters.created_by
      : true;
    const dateMatch = filters.dateRange?.from
      ? new Date(transaction.date) >= new Date(filters.dateRange.from.setHours(0, 0, 0, 0)) &&
      (filters.dateRange.to ? new Date(transaction.date) <= new Date(filters.dateRange.to.setHours(23, 59, 59, 999)) : true)
      : true;
    const paymentModeMatch = filters.payment_mode ? transaction.payment_mode === filters.payment_mode : true;
    return projectMatch && ledgerMatch && userMatch && dateMatch && paymentModeMatch;
  });
}

export function filterJournalEntries(
  entries: any[], // Type as JournalEntry[] if imported
  filters: FilterOptions
): any[] {
  return entries.filter((entry) => {
    // Ledger Filter: Checks if EITHER Debit OR Credit ledger matches
    const ledgerMatch = filters.ledger_id
      ? entry.debitLedgerId === filters.ledger_id || entry.creditLedgerId === filters.ledger_id
      : true;

    const userMatch = filters.created_by
      ? entry.createdBy === filters.created_by // Note: Schema uses createdBy, API might map to created_by? Check definitions.
      : true; // Wait, store maps to created_by usually? I need to check API map.

    const dateMatch = filters.dateRange?.from
      ? new Date(entry.date) >= new Date(filters.dateRange.from.setHours(0, 0, 0, 0)) &&
      (filters.dateRange.to ? new Date(entry.date) <= new Date(filters.dateRange.to.setHours(23, 59, 59, 999)) : true)
      : true;

    // Payment Mode: Checks if EITHER side uses the mode
    const paymentModeMatch = filters.payment_mode
      ? entry.debitMode === filters.payment_mode || entry.creditMode === filters.payment_mode
      : true;

    return ledgerMatch && userMatch && dateMatch && paymentModeMatch;
  });
}

export function filterRecordables(
  recordables: Recordable[],
  filters: FilterOptions
): Recordable[] {
  return recordables.filter((recordable) => {
    const projectMatch = filters.project_id
      ? recordable.project_id === filters.project_id
      : true;
    const ledgerMatch = filters.ledger_id
      ? recordable.ledger_id === filters.ledger_id
      : true;
    const userMatch = filters.created_by
      ? recordable.created_by === filters.created_by
      : true;
    const dateMatch = filters.dateRange?.from
      ? new Date(recordable.due_date) >= new Date(filters.dateRange.from.setHours(0, 0, 0, 0)) &&
      (filters.dateRange.to ? new Date(recordable.due_date) <= new Date(filters.dateRange.to.setHours(23, 59, 59, 999)) : true)
      : true;
    const paymentModeMatch = filters.payment_mode ? recordable.payment_mode === filters.payment_mode : true;
    const typeMatch = filters.type ? recordable.type === filters.type : true;
    const statusMatch = filters.status ? recordable.status === filters.status : true;

    return projectMatch && ledgerMatch && userMatch && dateMatch && paymentModeMatch && typeMatch && statusMatch;
  });
}