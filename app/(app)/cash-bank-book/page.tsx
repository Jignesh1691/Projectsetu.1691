
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useAppState } from '@/hooks/use-store';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, cn } from '@/lib/utils';
import { Download, FileText, File, Plus, Wallet, Building2, ChevronRight } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FinancialAccountForm } from '@/components/financial-account-form';
import { FinancialAccount } from '@/lib/definitions';

const ALL_USERS = 'all-users';

export default function CashBankBookPage() {
    const { transactions, journal_entries, projects, ledgers, users, financial_accounts, isLoaded } = useAppState();
    const { toast } = useToast();

    // State
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<string>(ALL_USERS);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<FinancialAccount | undefined>(undefined);

    // Filter accounts by type
    const cashAccounts = useMemo(() => financial_accounts.filter(a => a.type === 'CASH'), [financial_accounts]);
    const bankAccounts = useMemo(() => financial_accounts.filter(a => a.type === 'BANK'), [financial_accounts]);

    // Select default account on load
    useEffect(() => {
        if (isLoaded && !selectedAccountId && financial_accounts.length > 0) {
            // Prefer Default Cash or just the first one
            const defaultCash = financial_accounts.find(a => a.name === 'Default Cash');
            setSelectedAccountId(defaultCash ? defaultCash.id : financial_accounts[0].id);
        }
    }, [isLoaded, financial_accounts, selectedAccountId]);

    const selectedAccount = useMemo(() =>
        financial_accounts.find(a => a.id === selectedAccountId),
        [financial_accounts, selectedAccountId]);

    const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name || 'N/A';
    const getLedgerName = (id: string) => ledgers.find((l) => l.id === id)?.name || 'N/A';
    const getUserName = (id: string) => users.find((u) => u.id === id)?.name || 'N/A';

    const accountTransactions = useMemo(() => {
        if (!selectedAccountId) return [];

        // 1. Regular Transactions linked to this account
        const filteredTx = transactions
            .filter(t => t.financial_account_id === selectedAccountId)
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

        // 2. Journal Entries linked to this account
        const journalTx = (journal_entries || [])
            .filter(j =>
                (j.debit_account_id === selectedAccountId || j.credit_account_id === selectedAccountId) &&
                (selectedUser === ALL_USERS ? true : j.created_by === selectedUser)
            )
            .map(j => {
                const isDebit = j.debit_account_id === selectedAccountId; // Incoming to this account
                // Debit Account = Receiver (Income/Deposit)
                // Credit Account = Giver (Expense/Withdrawal)

                return {
                    id: j.id,
                    date: j.date,
                    amount: j.amount,
                    type: (isDebit ? 'income' : 'expense') as 'income' | 'expense',
                    description: j.description + ' (Journal)',
                    project_id: '',
                    ledger_id: isDebit ? (j.credit_ledger_id || '') : (j.debit_ledger_id || ''),
                    // Note: If transfer between accounts, ledger_id might be empty, need to handle showing other account name
                    creator: j.creator,
                    source: 'journal',
                    other_account_id: isDebit ? j.credit_account_id : j.debit_account_id // For transfers
                };
            });

        const merged = [...filteredTx, ...journalTx].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = selectedAccount?.openingBalance || 0;

        return merged.map(t => {
            if (t.type === 'income') {
                runningBalance += t.amount;
            } else {
                runningBalance -= t.amount;
            }
            return { ...t, runningBalance };
        });
    }, [transactions, journal_entries, selectedAccountId, selectedUser, selectedAccount]);

    const { totalIncome, totalExpense, closingBalance } = useMemo(() => {
        const totalIncome = accountTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = accountTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const currentBalance = (selectedAccount?.openingBalance || 0) + totalIncome - totalExpense;

        return { totalIncome, totalExpense, closingBalance: currentBalance };
    }, [accountTransactions, selectedAccount]);

    const exportToPDF = () => {
        if (accountTransactions.length === 0 || !selectedAccount) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }
        const doc = new jsPDF();
        doc.text(`${selectedAccount.name} - Statement`, 14, 15);

        if (selectedUser !== ALL_USERS) {
            doc.setFontSize(10);
            doc.text(`Filtered by User: ${getUserName(selectedUser)}`, 14, 22);
        }

        autoTable(doc, {
            startY: selectedUser !== ALL_USERS ? 28 : 20,
            head: [['Date', 'Project/Particulars', 'Description', 'Entry By', 'Debit (Out)', 'Credit (In)', 'Balance']],
            body: accountTransactions.map(t => [
                new Date(t.date).toLocaleDateString(),
                t.project_id ? getProjectName(t.project_id) : (t.ledger_id ? getLedgerName(t.ledger_id) : 'Transfer'),
                t.description,
                t.creator?.name || t.creator?.email || 'Unknown',
                t.type === 'expense' ? formatCurrency(t.amount, true) : '-',
                t.type === 'income' ? formatCurrency(t.amount, true) : '-',
                formatCurrency(t.runningBalance, true)
            ]),
        });
        doc.save(`${selectedAccount.name.replace(/\s+/g, '_')}_statement.pdf`);
    };

    const exportToExcel = () => {
        if (accountTransactions.length === 0 || !selectedAccount) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(accountTransactions.map(t => ({
            'Date': new Date(t.date).toLocaleDateString(),
            'Project/Particulars': t.project_id ? getProjectName(t.project_id) : (t.ledger_id ? getLedgerName(t.ledger_id) : 'Transfer'),
            'Description': t.description,
            'Entry By': t.creator?.name || t.creator?.email || 'Unknown',
            'Debit (Out)': t.type === 'expense' ? t.amount : null,
            'Credit (In)': t.type === 'income' ? t.amount : null,
            'Balance': t.runningBalance,
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Statement");
        XLSX.writeFile(workbook, `${selectedAccount.name.replace(/\s+/g, '_')}_statement.xlsx`);
    };

    const handleEditAccount = (account: FinancialAccount) => {
        setEditingAccount(account);
        setIsAddAccountOpen(true);
    };

    const handleAddAccount = () => {
        setEditingAccount(undefined);
        setIsAddAccountOpen(true);
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)]">
            {/* Sidebar: Accounts List */}
            <div className="w-full md:w-64 flex-shrink-0 space-y-4 md:border-r md:pr-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold">Accounts</h2>
                    <Button variant="ghost" size="icon" onClick={handleAddAccount} className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                {/* Cash Accounts Group */}
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Cash Accounts</h3>
                    {cashAccounts.length === 0 && <p className="text-xs text-muted-foreground px-2 italic">No cash accounts</p>}
                    {cashAccounts.map(account => (
                        <div
                            key={account.id}
                            onClick={() => setSelectedAccountId(account.id)}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                                selectedAccountId === account.id
                                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                                    : "bg-card hover:bg-accent border-border/50"
                            )}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={cn("p-2 rounded-full flex-shrink-0", selectedAccountId === account.id ? "bg-white/20" : "bg-emerald-500/10 text-emerald-600")}>
                                    <Wallet className="h-4 w-4" />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-bold truncate">{account.name}</p>
                                    <p className={cn("text-xs truncate", selectedAccountId === account.id ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                        Bal: {formatCurrency(account.openingBalance)} (Op)
                                    </p>
                                </div>
                            </div>
                            {selectedAccountId === account.id && <ChevronRight className="h-4 w-4 opacity-50" />}
                        </div>
                    ))}
                </div>

                {/* Bank Accounts Group */}
                <div className="space-y-2 mt-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">Bank Accounts</h3>
                    {bankAccounts.length === 0 && <p className="text-xs text-muted-foreground px-2 italic">No bank accounts</p>}
                    {bankAccounts.map(account => (
                        <div
                            key={account.id}
                            onClick={() => setSelectedAccountId(account.id)}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border",
                                selectedAccountId === account.id
                                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                                    : "bg-card hover:bg-accent border-border/50"
                            )}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={cn("p-2 rounded-full flex-shrink-0", selectedAccountId === account.id ? "bg-white/20" : "bg-blue-500/10 text-blue-600")}>
                                    <Building2 className="h-4 w-4" />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-bold truncate">{account.name}</p>
                                    <p className={cn("text-xs truncate", selectedAccountId === account.id ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                        {account.bankName || 'Bank'}
                                    </p>
                                </div>
                            </div>
                            {selectedAccountId === account.id && <ChevronRight className="h-4 w-4 opacity-50" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content: Ledger View */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pr-1">
                {!selectedAccount ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                        <Wallet className="h-12 w-12 mb-4 opacity-20" />
                        <h3 className="text-lg font-medium">Select an Account</h3>
                        <p className="text-sm">Choose a cash or bank account to view its statement.</p>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        {/* Header Stats */}
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-xl font-bold tracking-tight">{selectedAccount.name}</h1>
                                        <Button variant="ghost" size="sm" onClick={() => handleEditAccount(selectedAccount)} className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground">Edit</Button>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        {selectedAccount.type === 'BANK' && <span>{selectedAccount.bankName} • {selectedAccount.accountNumber}</span>}
                                        {selectedAccount.type === 'CASH' && <span>Cash Account</span>}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="w-[180px]">
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
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                <div className="rounded-xl border border-border/50 bg-emerald-50/30 dark:bg-emerald-900/20 p-3 shadow-sm border-l-4 border-l-emerald-500 flex flex-col justify-center">
                                    <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter mb-0.5">Total In</p>
                                    <div className="text-sm font-bold text-emerald-900 dark:text-emerald-100 truncate leading-none">₹{formatCurrency(totalIncome, true)}</div>
                                </div>
                                <div className="rounded-xl border border-border/50 bg-rose-50/30 dark:bg-rose-900/20 p-3 shadow-sm border-l-4 border-l-rose-500 flex flex-col justify-center">
                                    <p className="text-[9px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-tighter mb-0.5">Total Out</p>
                                    <div className="text-sm font-bold text-rose-900 dark:text-rose-100 truncate leading-none">₹{formatCurrency(totalExpense, true)}</div>
                                </div>
                                <div className={cn("rounded-xl border border-border/50 p-3 shadow-sm border-l-4 flex flex-col justify-center", closingBalance >= 0 ? "bg-blue-50/30 dark:bg-blue-900/20 border-l-blue-500" : "bg-orange-50/30 dark:bg-orange-900/20 border-l-orange-500")}>
                                    <p className={cn("text-[9px] font-bold uppercase tracking-tighter mb-0.5", closingBalance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400")}>Closing Balance</p>
                                    <div className={cn("text-sm font-bold truncate leading-none", closingBalance >= 0 ? "text-blue-900 dark:text-blue-100" : "text-orange-900 dark:text-orange-100")}>₹{formatCurrency(closingBalance, true)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Transaction List */}
                        {accountTransactions.length > 0 ? (
                            <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card flex-1">
                                <CardContent className="p-0">
                                    {/* Mobile View */}
                                    <div className="md:hidden divide-y divide-border/50">
                                        {accountTransactions.map(t => (
                                            <div key={t.id} className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-bold text-sm tracking-tight">{t.description}</h4>
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="text-xs text-muted-foreground font-medium">
                                                                {t.project_id ? getProjectName(t.project_id) : (t.ledger_id ? getLedgerName(t.ledger_id) : 'Transfer')}
                                                            </p>
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
                                                    <TableHead className="font-bold text-xs uppercase tracking-widest py-4">Particulars</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase tracking-widest py-4">Description</TableHead>
                                                    <TableHead className="font-bold text-xs uppercase tracking-widest py-4">Entry By</TableHead>
                                                    <TableHead className="text-right font-bold text-xs uppercase tracking-widest py-4">Debit (Out)</TableHead>
                                                    <TableHead className="text-right font-bold text-xs uppercase tracking-widest py-4">Credit (In)</TableHead>
                                                    <TableHead className="text-right font-bold text-xs uppercase tracking-widest py-4">Balance</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {accountTransactions.map(t => (
                                                    <TableRow key={t.id} className="border-border/50 hover:bg-muted/10 transition-colors group">
                                                        <TableCell className="py-4">
                                                            <div className="font-medium text-sm">{new Date(t.date).toLocaleDateString()}</div>
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <div className="font-bold text-sm tracking-tight">
                                                                {t.project_id ? getProjectName(t.project_id) : (t.ledger_id ? getLedgerName(t.ledger_id) : 'Transfer')}
                                                            </div>
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
                                <h3 className="text-xl font-bold tracking-tight">No history found</h3>
                                <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
                                    There are no transactions recorded for this account yet.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add/Edit Account Dialog */}
            <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
                    </DialogHeader>
                    <FinancialAccountForm
                        setOpen={setIsAddAccountOpen}
                        account={editingAccount}
                        onAccountCreated={(newAccount) => {
                            setSelectedAccountId(newAccount.id);
                        }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}


