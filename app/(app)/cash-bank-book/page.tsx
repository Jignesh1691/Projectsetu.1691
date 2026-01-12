
'use client';

import React, { useMemo, useState } from 'react';
import { useAppState } from '@/hooks/use-store';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import type { PaymentMode } from '@/lib/definitions';
import { Download, FileText, File, Filter } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';

const ALL_USERS = 'all-users';

export default function CashBankBookPage() {
    const { transactions, journal_entries, projects, ledgers, users, isLoaded } = useAppState();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<PaymentMode>('cash');
    const [selectedUser, setSelectedUser] = useState<string>(ALL_USERS);

    const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name || 'N/A';
    const getLedgerName = (id: string) => ledgers.find((l) => l.id === id)?.name || 'N/A';
    const getUserName = (id: string) => users.find((u) => u.id === id)?.name || 'N/A';

    const getTabTransactions = (mode: PaymentMode) => {
        // 1. Regular Transactions
        const filteredTx = transactions
            .filter(t => t.payment_mode === mode)
            .filter(t => selectedUser === ALL_USERS ? true : t.created_by === selectedUser)
            .map(t => ({
                id: t.id,
                date: t.date,
                amount: t.amount,
                type: t.type,
                description: t.description,
                project_id: t.project_id,
                ledger_id: t.ledger_id,
                creator: t.creator,
                source: 'transaction'
            }));

        // 2. Journal Entries
        // If mode is 'cash', we look for debit_mode='cash'(in) or credit_mode='cash'(out)
        // If mode is 'bank', we look for debit_mode='bank'(in) or credit_mode='bank'(out)

        const journalTx = (journal_entries || []) // Default to empty if undefined
            .filter(j =>
                (j.debit_mode === mode || j.credit_mode === mode) &&
                (selectedUser === ALL_USERS ? true : j.created_by === selectedUser)
            )
            .map(j => {
                const isDebit = j.debit_mode === mode; // Money came IN to this mode account
                // If Debit(In), type is 'income'. Ledger is the Credit side (Source).
                // If Credit(Out), type is 'expense'. Ledger is the Debit side (Destination).

                return {
                    id: j.id,
                    date: j.date,
                    amount: j.amount,
                    type: (isDebit ? 'income' : 'expense') as 'income' | 'expense',
                    description: j.description + ' (Journal)',
                    project_id: '', // Journal doesn&apos;t have project
                    ledger_id: isDebit ? (j.credit_ledger_id || '') : (j.debit_ledger_id || ''),
                    creator: j.creator,
                    source: 'journal'
                };
            });

        const merged = [...filteredTx, ...journalTx].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0;
        return merged.map(t => {
            if (t.type === 'income') {
                runningBalance += t.amount;
            } else {
                runningBalance -= t.amount;
            }
            return { ...t, runningBalance };
        });
    };

    const exportToPDF = () => {
        const processedTransactions = getTabTransactions(activeTab);
        if (processedTransactions.length === 0) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }
        const doc = new jsPDF();
        doc.text(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Book Report`, 14, 15);

        if (selectedUser !== ALL_USERS) {
            doc.setFontSize(10);
            doc.text(`Filtered by User: ${getUserName(selectedUser)}`, 14, 22);
        }

        autoTable(doc, {
            startY: selectedUser !== ALL_USERS ? 28 : 20,
            head: [['Date', 'Project', 'Ledger', 'Description', 'Entry By', 'Debit (INR)', 'Credit (INR)', 'Balance (INR)']],
            body: processedTransactions.map(t => [
                new Date(t.date).toLocaleDateString(),
                getProjectName(t.project_id),
                getLedgerName(t.ledger_id),
                t.description,
                t.creator?.name || t.creator?.email || 'Unknown',
                t.type === 'expense' ? formatCurrency(t.amount, true) : '-',
                t.type === 'income' ? formatCurrency(t.amount, true) : '-',
                formatCurrency(t.runningBalance, true)
            ]),
        });
        doc.save(`${activeTab}_book_report.pdf`);
    };

    const exportToExcel = () => {
        const processedTransactions = getTabTransactions(activeTab);
        if (processedTransactions.length === 0) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(processedTransactions.map(t => ({
            'Date': new Date(t.date).toLocaleDateString(),
            'Project': getProjectName(t.project_id),
            'Ledger': getLedgerName(t.ledger_id),
            'Description': t.description,
            'Entry By': t.creator?.name || t.creator?.email || 'Unknown',
            'Debit': t.type === 'expense' ? t.amount : null,
            'Credit': t.type === 'income' ? t.amount : null,
            'Balance': t.runningBalance,
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Book`);
        XLSX.writeFile(workbook, `${activeTab}_book_report.xlsx`);
    };

    const { processedTransactions, totalIncome, totalExpense, closingBalance } = useMemo(() => {
        if (!isLoaded) return { processedTransactions: [], totalIncome: 0, totalExpense: 0, closingBalance: 0 };

        const processed = getTabTransactions(activeTab);
        const totalIncome = processed.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = processed.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        return {
            processedTransactions: processed,
            totalIncome,
            totalExpense,
            closingBalance: totalIncome - totalExpense
        };
    }, [transactions, activeTab, isLoaded, selectedUser]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-xl font-bold tracking-tight">Cash & Bank Book</h1>
                    <p className="text-sm text-muted-foreground">Monitor running balances and ledger entries for cash and bank accounts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-[200px]">
                        <Combobox
                            options={[
                                { value: ALL_USERS, label: 'All Users' },
                                ...users.map(u => ({ value: u.id, label: u.name }))
                            ]}
                            value={selectedUser}
                            onChange={setSelectedUser}
                            placeholder="Filter by User"
                            searchPlaceholder="Search users..."
                            notFoundMessage="No users found."
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl border-border/50 shadow-sm"><Download className="mr-2 h-4 w-4" /> Export</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                            <DropdownMenuItem onClick={exportToPDF} className="rounded-lg"><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToExcel} className="rounded-lg"><File className="mr-2 h-4 w-4" /> Excel</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="bg-muted p-1 rounded-xl flex items-center gap-1 border border-border/50">
                        <Button
                            variant={activeTab === 'cash' ? 'secondary' : 'ghost'}
                            size="sm"
                            className={cn("rounded-lg px-4 h-8 text-xs font-semibold transition-all", activeTab === 'cash' && "bg-background shadow-sm")}
                            onClick={() => setActiveTab('cash')}
                        >
                            Cash Book
                        </Button>
                        <Button
                            variant={activeTab === 'bank' ? 'secondary' : 'ghost'}
                            size="sm"
                            className={cn("rounded-lg px-4 h-8 text-xs font-semibold transition-all", activeTab === 'bank' && "bg-background shadow-sm")}
                            onClick={() => setActiveTab('bank')}
                        >
                            Bank Book
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="rounded-xl border border-border/50 bg-emerald-50/30 dark:bg-emerald-900/20 p-3 shadow-sm border-l-4 border-l-emerald-500 flex flex-col justify-center">
                    <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter mb-0.5">Inflow</p>
                    <div className="text-sm font-bold text-emerald-900 dark:text-emerald-100 truncate leading-none">₹{formatCurrency(totalIncome, true)}</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-rose-50/30 dark:bg-rose-900/20 p-3 shadow-sm border-l-4 border-l-rose-500 flex flex-col justify-center">
                    <p className="text-[9px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-tighter mb-0.5">Outflow</p>
                    <div className="text-sm font-bold text-rose-900 dark:text-rose-100 truncate leading-none">₹{formatCurrency(totalExpense, true)}</div>
                </div>
                <div className={cn("rounded-xl border border-border/50 p-3 shadow-sm border-l-4 flex flex-col justify-center", closingBalance >= 0 ? "bg-blue-50/30 dark:bg-blue-900/20 border-l-blue-500" : "bg-orange-50/30 dark:bg-orange-900/20 border-l-orange-500")}>
                    <p className={cn("text-[9px] font-bold uppercase tracking-tighter mb-0.5", closingBalance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400")}>Balance</p>
                    <div className={cn("text-sm font-bold truncate leading-none", closingBalance >= 0 ? "text-blue-900 dark:text-blue-100" : "text-orange-900 dark:text-orange-100")}>₹{formatCurrency(closingBalance, true)}</div>
                </div>
            </div>

            {!isLoaded ? (
                <Card className="flex flex-col items-center justify-center rounded-3xl border-border/50 bg-card py-24 text-center">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <h3 className="mt-6 text-base font-bold tracking-tight">Syncing Ledger...</h3>
                    <p className="text-muted-foreground text-sm">Organizing your financial history.</p>
                </Card>
            ) : processedTransactions.length > 0 ? (
                <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
                    <CardContent className="p-0">
                        {/* Mobile View */}
                        <div className="md:hidden divide-y divide-border/50">
                            {processedTransactions.map(t => (
                                <div key={t.id} className="p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-sm tracking-tight">{t.description}</h4>
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-xs text-muted-foreground font-medium">{getProjectName(t.project_id)}</p>
                                                <p className="text-[10px] text-muted-foreground/70">By: {t.creator?.name || 'Unknown'}</p>
                                            </div>
                                        </div>
                                        <div className={cn('text-sm font-bold', t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">
                                        <div className="bg-muted/50 p-2 rounded-lg flex items-center justify-between">
                                            <span>Date</span>
                                            <span className="text-foreground">{new Date(t.date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="bg-muted/50 p-2 rounded-lg flex items-center justify-between">
                                            <span>Balance</span>
                                            <span className={cn(t.runningBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>{formatCurrency(t.runningBalance)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop View */}
                        <div className='hidden md:block overflow-x-auto'>
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="font-bold text-xs uppercase tracking-widest py-4">Date</TableHead>
                                        <TableHead className="font-bold text-xs uppercase tracking-widest py-4">Project / Ledger</TableHead>
                                        <TableHead className="font-bold text-xs uppercase tracking-widest py-4">Description</TableHead>
                                        <TableHead className="font-bold text-xs uppercase tracking-widest py-4">Entry By</TableHead>
                                        <TableHead className="text-right font-bold text-xs uppercase tracking-widest py-4">Debit (Out)</TableHead>
                                        <TableHead className="text-right font-bold text-xs uppercase tracking-widest py-4">Credit (In)</TableHead>
                                        <TableHead className="text-right font-bold text-xs uppercase tracking-widest py-4">Running Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedTransactions.map(t => (
                                        <TableRow key={t.id} className="border-border/50 hover:bg-muted/10 transition-colors group">
                                            <TableCell className="py-4">
                                                <div className="font-medium text-sm">{new Date(t.date).toLocaleDateString()}</div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="font-bold text-sm tracking-tight">{getProjectName(t.project_id)}</div>
                                                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">{getLedgerName(t.ledger_id)}</div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="text-sm text-muted-foreground font-medium">{t.description}</div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="text-sm text-muted-foreground">{t.creator?.name || t.creator?.email || 'Unknown'}</div>
                                            </TableCell>
                                            <TableCell className="text-right py-4">
                                                {t.type === 'expense' ? (
                                                    <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">{formatCurrency(t.amount)}</span>
                                                ) : <span className="text-muted-foreground/20">—</span>}
                                            </TableCell>
                                            <TableCell className="text-right py-4">
                                                {t.type === 'income' ? (
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatCurrency(t.amount)}</span>
                                                ) : <span className="text-muted-foreground/20">—</span>}
                                            </TableCell>
                                            <TableCell className="text-right py-4">
                                                <div className={cn(
                                                    "font-bold text-sm tabular-nums inline-flex items-center px-2 py-1 rounded-lg",
                                                    t.runningBalance >= 0 ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/5" : "text-rose-700 dark:text-rose-400 bg-rose-500/5"
                                                )}>
                                                    {formatCurrency(t.runningBalance)}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center rounded-3xl bg-muted/20 border-2 border-dashed border-border/50">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                        <FileText className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-xl font-bold tracking-tight">No {activeTab} history yet</h3>
                    <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
                        Your transaction history for {activeTab} payments will appear here once you start recording them in the workspace.
                    </p>
                </div>
            )}
        </div>
    );
}

