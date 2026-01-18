
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreVertical, Pencil, Trash2, BookOpen, Download, FileText, File, View } from 'lucide-react';
import { useAppState } from '@/hooks/use-store';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LedgerForm } from '@/components/ledger-form';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Ledger } from '@/lib/definitions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { deleteLedger } from '@/lib/store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Recordable, Transaction, JournalEntry } from '@/lib/definitions';
import { getEffectiveTransaction, getEffectiveRecordable } from '@/lib/financial-utils';


const PREDEFINED_LEDGERS = ["Salary/Hajari"];


export default function LedgersPage() {
  const { ledgers, transactions, journal_entries, appUser, isLoaded, userVisibleProjects, recordables } = useAppState();
  const { toast } = useToast();
  const [isLedgerFormOpen, setLedgerFormOpen] = useState(false);
  const [editingLedger, setEditingLedger] = useState<Ledger | undefined>(undefined);
  const [deletingLedgerId, setDeletingLedgerId] = useState<string | null>(null);
  const [viewingLedger, setViewingLedger] = useState<Ledger | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');


  const deletingLedger = useMemo(() => ledgers.find(l => l.id === deletingLedgerId), [ledgers, deletingLedgerId]);

  const handleAddLedgerClick = () => {
    setEditingLedger(undefined);
    setLedgerFormOpen(true);
  };

  const handleEditLedgerClick = (ledger: Ledger) => {
    setEditingLedger(ledger);
    setLedgerFormOpen(true);
  };

  const handleDeleteLedgerClick = (ledgerId: string) => {
    setDeletingLedgerId(ledgerId);
  }

  const handleDeleteConfirm = async () => {
    if (deletingLedger && deleteConfirmation === deletingLedger.name) {
      await deleteLedger(deletingLedger.id, appUser!);
      toast({
        title: 'Success!',
        description: `Ledger "${deletingLedger.name}" has been deleted.`,
      });
      setDeletingLedgerId(null);
      setDeleteConfirmation('');
    }
  };

  const filteredLedgers = useMemo(() => {
    if (!isLoaded || !appUser) return [];

    return ledgers.filter(ledger => {
      const matchesSearch = ledger.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const isPettyCash = ledger.name.toLowerCase().endsWith(' petty cash');
      const isOwnPettyCash = ledger.name === `${appUser.name} Petty Cash`;

      // 1. If it's a petty cash ledger
      if (isPettyCash) {
        // Admins see ALL petty cash ledgers
        if (appUser.role === 'admin') return true;
        // Non-admins only see their OWN petty cash ledger
        return isOwnPettyCash;
      }

      // 2. For regular ledgers, just return true since it matches search
      return true;
    });
  }, [ledgers, searchTerm, isLoaded, appUser]);

  const summary = useMemo(() => {
    if (!isLoaded) return { totalIncome: 0, totalExpense: 0, netBalance: 0, totalReceivable: 0, totalPayable: 0, netOutstanding: 0 };

    const effectiveTx = transactions
      .map(t => getEffectiveTransaction(t))
      .filter((t): t is Transaction => t !== null && (selectedProjectId === 'all' || t.project_id === selectedProjectId));

    const effectiveRecords = recordables
      .map(r => getEffectiveRecordable(r))
      .filter((r): r is Recordable => r !== null && (selectedProjectId === 'all' || r.project_id === selectedProjectId));

    const totalIncome = effectiveTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = effectiveTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const totalReceivable = effectiveRecords.filter(r => r.type === 'asset' && r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
    const totalPayable = effectiveRecords.filter(r => r.type === 'liability' && r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      totalReceivable,
      totalPayable,
      netOutstanding: totalReceivable - totalPayable
    };
  }, [transactions, recordables, selectedProjectId, isLoaded]);

  const calculateLedgerFinancials = (ledger: Ledger, projectId: string = 'all') => {
    // If we have server-side stats and no project filter, use them (Phase 1/2 speedup)
    if (projectId === 'all' && (ledger as any)._stats) {
      const stats = (ledger as any)._stats;
      return {
        income: stats.income,
        expenses: stats.expense,
        net: stats.net,
        transactionCount: stats.transactionCount
      };
    }

    // Fallback/Project-specific: Client-side calculation
    let ledgerTransactions = transactions
      .filter((t) => t.ledger_id === ledger.id)
      .map(t => getEffectiveTransaction(t))
      .filter((t): t is Transaction => t !== null);

    if (projectId !== 'all') {
      ledgerTransactions = ledgerTransactions.filter(t => t.project_id === projectId);
    }

    const incomeTx = ledgerTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expensesTx = ledgerTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    let ledgerJournalDebits: JournalEntry[] = [];
    let ledgerJournalCredits: JournalEntry[] = [];

    if (projectId === 'all') {
      ledgerJournalDebits = journal_entries ? journal_entries.filter(j => j.debit_ledger_id === ledger.id) : [];
      ledgerJournalCredits = journal_entries ? journal_entries.filter(j => j.credit_ledger_id === ledger.id) : [];
    }

    const journalDebits = ledgerJournalDebits.reduce((sum, j) => sum + j.amount, 0);
    const journalCredits = ledgerJournalCredits.reduce((sum, j) => sum + j.amount, 0);

    const income = incomeTx + journalCredits;
    const expenses = expensesTx + journalDebits;
    const net = income - expenses;
    const transactionCount = ledgerTransactions.length + ledgerJournalDebits.length + ledgerJournalCredits.length;

    return { income, expenses, net, transactionCount };
  };

  const exportToPDF = () => {
    if (filteredLedgers.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Calculate Aggregate Totals
    const aggs = filteredLedgers.reduce((acc, l) => {
      const { income, expenses } = calculateLedgerFinancials(l, selectedProjectId);
      acc.income += income;
      acc.expenses += expenses;
      return acc;
    }, { income: 0, expenses: 0 });
    const netAgg = aggs.income - aggs.expenses;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text('Ledgers Report', 14, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text('Ledgers Report', 14, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const projectName = selectedProjectId !== 'all' ? userVisibleProjects.find(p => p.id === selectedProjectId)?.name : 'All Projects';
    doc.text(`Project: ${projectName} | Generated: ${new Date().toLocaleDateString()}`, 14, 22);

    // Financial Overview Section with Cards
    const overviewY = 30;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text("Global Financial Overview", 14, overviewY);

    const cardY = overviewY + 5;
    const cardGap = 6;
    const availableWidth = doc.internal.pageSize.getWidth() - 28;
    const cardWidth = (availableWidth - (cardGap * 2)) / 3;
    const cardHeight = 22;

    const drawCard = (x: number, title: string, amount: number, type: 'income' | 'expense' | 'net') => {
      let bgColor: [number, number, number] = [255, 255, 255];
      let borderColor: [number, number, number] = [200, 200, 200];
      let textColor: [number, number, number] = [40, 40, 40];

      if (type === 'income') {
        bgColor = [236, 253, 245];
        borderColor = [167, 243, 208];
        textColor = [6, 95, 70];
      } else if (type === 'expense') {
        bgColor = [254, 242, 242];
        borderColor = [254, 205, 211];
        textColor = [159, 18, 57];
      } else {
        bgColor = [240, 249, 255];
        borderColor = [186, 230, 253];
        textColor = [12, 74, 110];
      }

      doc.setFillColor(...bgColor);
      doc.setDrawColor(...borderColor);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(title.toUpperCase(), x + 6, cardY + 8);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text(`Rs. ${formatCurrency(amount, true)}`, x + 6, cardY + 17);
    };

    drawCard(14, "Total Income", aggs.income, 'income');
    drawCard(14 + cardWidth + cardGap, "Total Expense", aggs.expenses, 'expense');
    drawCard(14 + (cardWidth * 2) + (cardGap * 2), "Net Balance", netAgg, 'net');

    // Table
    const tableStartY = cardY + cardHeight + 15;
    autoTable(doc, {
      startY: tableStartY,
      head: [['Ledger Name', 'Txns', 'Income', 'Expenses', 'Net']],
      body: filteredLedgers.map(l => {
        const { income, expenses, net, transactionCount } = calculateLedgerFinancials(l, selectedProjectId);
        return [l.name, transactionCount, `Rs. ${formatCurrency(income, true)}`, `Rs. ${formatCurrency(expenses, true)}`, `Rs. ${formatCurrency(net, true)}`];
      }),
      theme: 'grid',
      headStyles: {
        fillColor: [245, 247, 250],
        textColor: [40, 40, 40],
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        halign: 'center'
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4 && data.cell.raw) {
          const val = parseFloat(data.cell.raw.toString().replace(/[^0-9.-]+/g, ""));
          data.cell.styles.textColor = val >= 0 ? [22, 163, 74] : [220, 38, 38];
        }
      }
    });

    doc.save('ledgers_report.pdf');
  };

  const exportToExcel = () => {
    if (filteredLedgers.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      filteredLedgers.map(l => {
        const { income, expenses, net, transactionCount } = calculateLedgerFinancials(l, selectedProjectId);
        return {
          'Ledger Name': l.name,
          'Transactions': transactionCount,
          'Income (INR)': income,
          'Expenses (INR)': expenses,
          'Net (INR)': net,
        };
      })
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledgers');
    XLSX.writeFile(workbook, 'ledgers_report.xlsx');
  };

  const exportLedgerReport = (ledger: Ledger, format: 'pdf' | 'excel') => {
    let ledgerTransactions = transactions.filter(t => t.ledger_id === ledger.id);
    let ledgerOutstandings = recordables.filter(r => r.ledger_id === ledger.id);
    let ledgerJournalDebits: JournalEntry[] = [];
    let ledgerJournalCredits: JournalEntry[] = [];

    if (selectedProjectId !== 'all') {
      ledgerTransactions = ledgerTransactions.filter(t => t.project_id === selectedProjectId);
      ledgerOutstandings = ledgerOutstandings.filter(r => r.project_id === selectedProjectId);
    } else {
      ledgerJournalDebits = journal_entries ? journal_entries.filter(j => j.debit_ledger_id === ledger.id) : [];
      ledgerJournalCredits = journal_entries ? journal_entries.filter(j => j.credit_ledger_id === ledger.id) : [];
    }

    // Sort logic if needed? usually sorted by date in store/backend but let's trust store for now

    const getProjectName = (id: string) => userVisibleProjects.find(p => p.id === id)?.name || 'N/A';

    if (format === 'pdf') {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(`Ledger Report: ${ledger.name}`, 14, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      const projectText = selectedProjectId !== 'all' ? `Project: ${getProjectName(selectedProjectId)}` : 'All Projects';
      doc.text(`${projectText} | Generated: ${new Date().toLocaleDateString()}`, 14, 26);

      // Financials for this specific filtered view
      const { income, expenses, net } = calculateLedgerFinancials(ledger, selectedProjectId);

      // Calculate outstandings
      const ledgerReceivable = ledgerOutstandings.filter(r => r.type === 'asset' && r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
      const ledgerPayable = ledgerOutstandings.filter(r => r.type === 'liability' && r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);

      const overviewY = 35;

      // Cards
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40);
      doc.text("Financial Overview", 14, overviewY);

      const cardY = overviewY + 5;
      const cardGap = 4;
      const availableWidth = doc.internal.pageSize.getWidth() - 28;
      const smallCardWidth = (availableWidth - (cardGap * 4)) / 5;
      const cardHeight = 22;

      const drawCard = (x: number, title: string, amount: number, type: 'income' | 'expense' | 'net' | 'rec' | 'pay') => {
        let bgColor: [number, number, number] = [255, 255, 255];
        let borderColor: [number, number, number] = [200, 200, 200];
        let textColor: [number, number, number] = [40, 40, 40];

        if (type === 'income' || type === 'rec') {
          bgColor = [236, 253, 245];
          borderColor = [167, 243, 208];
          textColor = [6, 95, 70];
        } else if (type === 'expense' || type === 'pay') {
          bgColor = [254, 242, 242];
          borderColor = [254, 205, 211];
          textColor = [159, 18, 57];
        } else {
          bgColor = [240, 249, 255];
          borderColor = [186, 230, 253];
          textColor = [12, 74, 110];
        }

        doc.setFillColor(...bgColor);
        doc.setDrawColor(...borderColor);
        doc.roundedRect(x, cardY, smallCardWidth, cardHeight, 3, 3, 'FD');
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(title.toUpperCase(), x + 6, cardY + 8);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textColor);
        doc.text(`Rs. ${formatCurrency(amount, true)}`, x + 6, cardY + 17);
      };

      drawCard(14, "Total Income", income, 'income');
      drawCard(14 + smallCardWidth + cardGap, "Total Expense", expenses, 'expense');
      drawCard(14 + (smallCardWidth + cardGap) * 2, "Net Balance", net, 'net');
      drawCard(14 + (smallCardWidth + cardGap) * 3, "Receivable", ledgerReceivable, 'rec');
      drawCard(14 + (smallCardWidth + cardGap) * 4, "Payable", ledgerPayable, 'pay');

      let lastY = cardY + cardHeight + 12;

      const addSection = (title: string, head: string[][], body: any[][], colorCallback?: (data: any) => void) => {
        if (body.length > 0) {
          doc.setTextColor(40);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(title, 14, lastY + 6);
          autoTable(doc, {
            head,
            body,
            startY: lastY + 10,
            theme: 'grid',
            headStyles: {
              fillColor: [245, 247, 250],
              textColor: [40, 40, 40],
              fontStyle: 'bold',
              lineWidth: 0.1,
              lineColor: [220, 220, 220],
              halign: 'center',
              valign: 'middle'
            },
            styles: {
              fontSize: 9,
              cellPadding: 3,
              lineWidth: 0.1,
              lineColor: [230, 230, 230],
              halign: 'center',
              valign: 'middle'
            },
            didParseCell: colorCallback
          });
          lastY = (doc as any).lastAutoTable.finalY + 10;
        }
      };

      addSection('Transactions',
        [['Date', 'Description', 'Project', 'Type', 'Amount']],
        ledgerTransactions.map((t: Transaction) => [new Date(t.date).toLocaleDateString(), t.description, getProjectName(t.project_id), t.type.toUpperCase(), `Rs. ${formatCurrency(t.amount, true)}`]),
        (data) => {
          if (data.section === 'body') {
            if (data.column.index === 3) { // Type
              const type = data.cell.text[0].toLowerCase();
              data.cell.styles.textColor = type === 'income' ? [22, 163, 74] : [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.column.index === 4) { // Amount
              const type = data.row.raw[3].toLowerCase();
              data.cell.styles.textColor = type === 'income' ? [22, 163, 74] : [220, 38, 38];
              data.cell.styles.halign = 'center';
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      );

      addSection('Outstandings',
        [['Due Date', 'Description', 'Project', 'Type', 'Amount', 'Status']],
        ledgerOutstandings.map((r: Recordable) => [new Date(r.due_date).toLocaleDateString(), r.description, getProjectName(r.project_id), r.type.toUpperCase(), `Rs. ${formatCurrency(r.amount, true)}`, r.status.toUpperCase()]),
        (data) => {
          if (data.section === 'body') {
            if (data.column.index === 3) {
              const type = data.cell.text[0].toLowerCase();
              data.cell.styles.textColor = type === 'asset' ? [22, 163, 74] : [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.column.index === 4) {
              const type = data.row.raw[3].toLowerCase();
              data.cell.styles.textColor = type === 'asset' ? [22, 163, 74] : [220, 38, 38];
              data.cell.styles.halign = 'center';
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.column.index === 5) {
              data.cell.styles.textColor = data.cell.text[0].toLowerCase() === 'paid' ? [22, 163, 74] : [234, 179, 8];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      );

      if (selectedProjectId === 'all') {
        // Add Journal Entries section only if filtering is off
        const allJournal = [...ledgerJournalDebits, ...ledgerJournalCredits]; // TODO: sort by date
        addSection('Journal Entries',
          [['Date', 'Description', 'Entry Type', 'Amount']],
          allJournal.map(j => {
            const isDebit = j.debit_ledger_id === ledger.id;
            return [
              new Date(j.date).toLocaleDateString(),
              j.description,
              isDebit ? 'DEBIT (Expense)' : 'CREDIT (Income)',
              `Rs. ${formatCurrency(j.amount, true)}`
            ];
          }),
          (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              const isDebit = data.cell.text.startsWith('DEBIT');
              data.cell.styles.textColor = isDebit ? [220, 38, 38] : [22, 163, 74];
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.section === 'body' && data.column.index === 3) {
              const isDebit = data.row.raw[2].startsWith('DEBIT');
              data.cell.styles.textColor = isDebit ? [220, 38, 38] : [22, 163, 74];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        );
      }

      doc.save(`Ledger_Report_${ledger.name}.pdf`);

    } else {
      const wb = XLSX.utils.book_new();

      const addSheet = (sheetName: string, data: any[]) => {
        if (data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      }

      addSheet('Transactions', ledgerTransactions.map(t => ({ Date: new Date(t.date).toLocaleDateString(), Description: t.description, Project: getProjectName(t.project_id), Type: t.type, Amount: t.amount })));
      addSheet('Outstandings', ledgerOutstandings.map(r => ({ 'Due Date': new Date(r.due_date).toLocaleDateString(), Description: r.description, Project: getProjectName(r.project_id), Type: r.type, Amount: r.amount, Status: r.status })));

      if (selectedProjectId === 'all') {
        const allJournal = [...ledgerJournalDebits, ...ledgerJournalCredits];
        addSheet('Journal Entries', allJournal.map(j => ({
          Date: new Date(j.date).toLocaleDateString(),
          Description: j.description,
          Type: j.debit_ledger_id === ledger.id ? 'DEBIT' : 'CREDIT',
          Amount: j.amount
        })));
      }

      XLSX.writeFile(wb, `Ledger_Report_${ledger.name}.xlsx`);
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Ledgers</h1>
          <p className="text-muted-foreground">Manage and track your expense categories.</p>
        </div>
        <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto'>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full sm:w-[180px] rounded-xl border-border/50 shadow-sm">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {userVisibleProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none rounded-xl border-border/50 shadow-sm"><Download className="mr-2 h-4 w-4" /> Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={exportToPDF}><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel}><File className="mr-2 h-4 w-4" /> Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleAddLedgerClick} className="flex-1 sm:flex-none rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-4 w-4" /> New Ledger
            </Button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <BookOpen className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <Input
          placeholder="Search ledgers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-14 bg-card border-border/50 shadow-sm rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-base"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-xl border border-border/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 shadow-sm border-l-4 border-l-emerald-500 flex flex-col justify-center">
          <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 upper-case tracking-tighter mb-0.5">Total Income</p>
          <div className="text-sm font-bold text-emerald-900 dark:text-emerald-300 truncate leading-none">₹{formatCurrency(summary.totalIncome, true)}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-rose-50/50 dark:bg-rose-950/20 p-3 shadow-sm border-l-4 border-l-rose-500 flex flex-col justify-center">
          <p className="text-[9px] font-bold text-rose-700 dark:text-rose-400 upper-case tracking-tighter mb-0.5">Total Expense</p>
          <div className="text-sm font-bold text-rose-900 dark:text-rose-300 truncate leading-none">₹{formatCurrency(summary.totalExpense, true)}</div>
        </div>
        <div className={cn("rounded-xl border border-border/50 p-3 shadow-sm border-l-4 flex flex-col justify-center", summary.netBalance >= 0 ? "bg-blue-50/50 dark:bg-blue-950/20 border-l-blue-500" : "bg-orange-50/50 dark:bg-orange-950/20 border-l-orange-500")}>
          <p className={cn("text-[9px] font-bold uppercase tracking-tighter mb-0.5", summary.netBalance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400")}>Net Balance</p>
          <div className={cn("text-sm font-bold truncate leading-none", summary.netBalance >= 0 ? "text-blue-900 dark:text-blue-300" : "text-orange-900 dark:text-orange-300")}>₹{formatCurrency(summary.netBalance, true)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-xl border border-border/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 shadow-sm border-l-4 border-l-emerald-500 flex flex-col justify-center">
          <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 upper-case tracking-tighter mb-0.5">Receivable</p>
          <div className="text-sm font-bold text-emerald-900 dark:text-emerald-300 truncate leading-none">₹{formatCurrency(summary.totalReceivable, true)}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-rose-50/50 dark:bg-rose-950/20 p-3 shadow-sm border-l-4 border-l-rose-500 flex flex-col justify-center">
          <p className="text-[9px] font-bold text-rose-700 dark:text-rose-400 upper-case tracking-tighter mb-0.5">Payable</p>
          <div className="text-sm font-bold text-rose-900 dark:text-rose-300 truncate leading-none">₹{formatCurrency(summary.totalPayable, true)}</div>
        </div>
        <div className={cn("rounded-xl border border-border/50 p-3 shadow-sm border-l-4 flex flex-col justify-center", summary.netOutstanding >= 0 ? "bg-blue-50/50 dark:bg-blue-950/20 border-l-blue-500" : "bg-orange-50/50 dark:bg-orange-950/20 border-l-orange-500")}>
          <p className={cn("text-[9px] font-bold uppercase tracking-tighter mb-0.5", summary.netOutstanding >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400")}>Net Outstanding</p>
          <div className={cn("text-sm font-bold truncate leading-none", summary.netOutstanding >= 0 ? "text-blue-900 dark:text-blue-300" : "text-orange-900 dark:text-orange-300")}>₹{formatCurrency(summary.netOutstanding, true)}</div>
        </div>
      </div>

      {!isLoaded ? (
        <div className="space-y-4">
          <div className="md:hidden space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i} className="border-border/50 rounded-xl overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-5 w-1/4" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="hidden md:block">
            <Card className="border-border/50 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
                    <TableHead className="text-right w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      ) : filteredLedgers.length > 0 ? (
        <>
          {/* Mobile View */}
          <div className="md:hidden">
            {filteredLedgers.map(ledger => {
              const { income, expenses, net } = calculateLedgerFinancials(ledger, selectedProjectId);
              const isPredefined = PREDEFINED_LEDGERS.includes(ledger.name);
              return (
                <Card key={ledger.id} className="border-x-0 border-t-0 rounded-none first:border-t bg-card">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold flex items-center truncate">
                          {ledger.name}
                          {isPredefined && <Badge variant="secondary" className="ml-2 h-4 px-1 text-[8px]">System</Badge>}
                        </p>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-1">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">In: {formatCurrency(income)}</span>
                          <span className="text-rose-600 dark:text-rose-400 font-medium">Out: {formatCurrency(expenses)}</span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <p className={cn('font-bold text-sm', net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>
                          {formatCurrency(net)}
                        </p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuItem onClick={() => setViewingLedger(ledger)}>
                              <View className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Download className="mr-2 h-4 w-4" /> Export Report
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent className="rounded-xl">
                                  <DropdownMenuItem onClick={() => exportLedgerReport(ledger, 'pdf')}><FileText className="mr-2 h-4 w-4" /> PDF Report</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => exportLedgerReport(ledger, 'excel')}><File className="mr-2 h-4 w-4" /> Excel Report</DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            {appUser?.role === 'admin' && !isPredefined && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEditLedgerClick(ledger)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive font-medium" onClick={() => handleDeleteLedgerClick(ledger.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ledger Name</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expense</TableHead>
                      <TableHead className="text-right">Net Balance</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLedgers.map(ledger => {
                      const { income, expenses, net } = calculateLedgerFinancials(ledger, selectedProjectId);
                      const isPredefined = PREDEFINED_LEDGERS.includes(ledger.name);
                      return (
                        <TableRow key={ledger.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              {ledger.name}
                              {isPredefined && <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">System</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(income)}</TableCell>
                          <TableCell className="text-right text-rose-600 dark:text-rose-400 font-medium">{formatCurrency(expenses)}</TableCell>
                          <TableCell className={cn('text-right font-bold', net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>
                            {formatCurrency(net)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                <DropdownMenuItem onClick={() => setViewingLedger(ledger)}>
                                  <View className="mr-2 h-4 w-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Download className="mr-2 h-4 w-4" /> Export Report
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                    <DropdownMenuSubContent className="rounded-xl">
                                      <DropdownMenuItem onClick={() => exportLedgerReport(ledger, 'pdf')}><FileText className="mr-2 h-4 w-4" /> PDF Report</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => exportLedgerReport(ledger, 'excel')}><File className="mr-2 h-4 w-4" /> Excel Report</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                                </DropdownMenuSub>
                                {appUser?.role === 'admin' && !isPredefined && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleEditLedgerClick(ledger)}>
                                      <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive font-medium" onClick={() => handleDeleteLedgerClick(ledger.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl bg-muted/20 border-2 border-dashed border-border/50">
          <BookOpen className="h-16 w-16 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">{searchTerm ? 'No Ledgers Found' : 'No Ledgers Yet'}</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            {searchTerm ? `We couldn't find any ledgers matching "${searchTerm}".` : 'Get started by creating your first ledger or cost code.'}
          </p>
          {!searchTerm &&
            <Button className="mt-6 rounded-xl bg-primary px-8 h-12 shadow-lg shadow-primary/20" onClick={handleAddLedgerClick}>
              <PlusCircle className="mr-2 h-5 w-5" />
              Create Ledger
            </Button>
          }
        </div>
      )}

      <Dialog open={isLedgerFormOpen} onOpenChange={setLedgerFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingLedger ? 'Edit' : 'Create a New'} Ledger</DialogTitle>
            <DialogDescription>
              {editingLedger ? 'Update the name of your ledger.' : 'Ledgers help you categorize job costs (e.g., Labor, Materials).'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <LedgerForm setOpen={setLedgerFormOpen} ledger={editingLedger} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingLedger} onOpenChange={() => setViewingLedger(undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewingLedger?.name}</DialogTitle>
          </DialogHeader>
          {viewingLedger && (
            <div className="space-y-4 pt-4 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className='text-muted-foreground'>Transactions</div> <div className='text-right'><Badge variant='outline'>{calculateLedgerFinancials(viewingLedger, selectedProjectId).transactionCount}</Badge></div>
                <div className='text-muted-foreground'>Total Income</div> <div className='text-right font-semibold text-green-600 dark:text-green-400'>{formatCurrency(calculateLedgerFinancials(viewingLedger, selectedProjectId).income)}</div>
                <div className='text-muted-foreground'>Total Expenses</div> <div className='text-right font-semibold text-red-600 dark:text-red-400'>{formatCurrency(calculateLedgerFinancials(viewingLedger, selectedProjectId).expenses)}</div>
                <div className='text-muted-foreground font-bold'>Net Total</div> <div className={cn('text-right font-bold', calculateLedgerFinancials(viewingLedger, selectedProjectId).net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{formatCurrency(calculateLedgerFinancials(viewingLedger, selectedProjectId).net)}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingLedger} onOpenChange={(open) => { if (!open) { setDeletingLedgerId(null); setDeleteConfirmation(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the <strong>{deletingLedger?.name}</strong> ledger and all associated transactions. To confirm, please type the ledger name below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Ledger Name</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder={deletingLedger?.name}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmation !== deletingLedger?.name}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}


