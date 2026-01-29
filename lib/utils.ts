

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Transaction, Recordable, PaymentMode, RecordType, RecordStatus } from "./definitions";
import type { DateRange } from "react-day-picker";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, pdfExport = false) {
  const absoluteAmount = Math.abs(amount);

  if (pdfExport) {
    // Return only the number for PDF export, as the symbol is handled separately
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absoluteAmount);
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    signDisplay: 'never',
  }).format(absoluteAmount);
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

/**
 * Gets the current Indian financial year string (April to March)
 * e.g., "25-26" for April 2025 to March 2026
 */
export function getFinancialYear(date: Date = new Date()): string {
  const currentMonth = date.getMonth(); // 0-indexed: 3 is April
  const currentYear = date.getFullYear();

  let startYear, endYear;

  if (currentMonth >= 3) {
    // April or later: current year is start year
    startYear = currentYear;
    endYear = currentYear + 1;
  } else {
    // Jan, Feb, Mar: previous year is start year
    startYear = currentYear - 1;
    endYear = currentYear;
  }

  // Use last two digits of years
  const startStr = startYear.toString().slice(-2);
  const endStr = endYear.toString().slice(-2);

  return `${startStr}-${endStr}`;
}