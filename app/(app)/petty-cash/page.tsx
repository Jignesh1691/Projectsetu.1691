'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, FileText, File } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PettyCashForm } from '@/components/petty-cash/petty-cash-form';
import { ensurePettyCashLedger, PETTY_CASH_LEDGER } from '@/lib/store/finances';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TransactionsTable } from '@/components/transactions-table';

export default function PettyCashPage() {
    const { transactions, isLoaded, currentUser, userVisibleProjects, appUser } = useAppState();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [pettyCashLedgerId, setPettyCashLedgerId] = useState<string | null>(null);
    const [editingTransaction, setEditingTransaction] = useState<any>(null);

    const isAdmin = appUser?.role === 'admin';

    const handleEdit = (transaction: any) => {
        setEditingTransaction(transaction);
        setIsFormOpen(true);
    };

    useEffect(() => {
        const init = async () => {
            if (currentUser && !isAdmin) {
                const id = await ensurePettyCashLedger(currentUser);
                setPettyCashLedgerId(id);
            }
        };
        if (isLoaded) init();
    }, [isLoaded, currentUser, isAdmin]);

    const filteredTransactions = useMemo(() => {
        if (!pettyCashLedgerId || isAdmin) return [];

        let txs = transactions.filter(t => t.ledger_id === pettyCashLedgerId);

        if (selectedProjectId !== 'all') {
            txs = txs.filter(t => t.project_id === selectedProjectId);
        }

        if (searchTerm) {
            txs = txs.filter(t =>
                t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.amount.toString().includes(searchTerm)
            );
        }

        return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, pettyCashLedgerId, selectedProjectId, searchTerm, isAdmin]);

    const stats = useMemo(() => {
        const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return {
            income,
            expense,
            balance: income - expense
        };
    }, [filteredTransactions]);

    if (!isLoaded) {
        return <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64" />
        </div>;
    }

    if (isAdmin) {
        return <div className="p-8 text-center bg-muted/30 rounded-3xl border-2 border-dashed border-border/50">
            <h2 className="text-xl font-bold mb-2">Unauthorized Access</h2>
            <p className="text-muted-foreground">Petty Cash is an operational tool for field users and is not available for administrators.</p>
        </div>;
    }

    const getProjectName = (id: string) => userVisibleProjects.find(p => p.id === id)?.name || 'N/A';

    const exportPettyCashReport = (format: 'pdf' | 'excel') => {
        if (filteredTransactions.length === 0) {
            // Toast removed to avoid adding dependency here if not needed, but ideally show toast
            return;
        }

        if (format === 'pdf') {
            const doc = new jsPDF();

            // Title
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.text(`My Petty Cash Report`, 14, 20);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            const projectText = selectedProjectId !== 'all' ? `Project: ${getProjectName(selectedProjectId)}` : 'All Projects';
            doc.text(`${projectText} | Generated: ${new Date().toLocaleDateString()}`, 14, 26);

            const overviewY = 35;
            // Cards Title
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(40);
            doc.text("Financial Overview", 14, overviewY);

            const cardY = overviewY + 5;
            const cardGap = 4;
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

            drawCard(14, "Total Inflow", stats.income, 'income');
            drawCard(14 + cardWidth + cardGap, "Total Outflow", stats.expense, 'expense');
            drawCard(14 + (cardWidth * 2) + (cardGap * 2), "Current Balance", stats.balance, 'net');

            // Table
            const tableStartY = cardY + cardHeight + 15;
            autoTable(doc, {
                startY: tableStartY,
                head: [['Date', 'Description', 'Project', 'Mode', 'Amount']],
                body: filteredTransactions.map(t => [
                    new Date(t.date).toLocaleDateString(),
                    t.description,
                    getProjectName(t.project_id),
                    t.payment_mode.toUpperCase(),
                    `Rs. ${formatCurrency(t.amount, true)}`
                ]),
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
                    // specific styling if needed
                }
            });

            doc.save('petty_cash_report.pdf');
        } else {
            // Excel
            const worksheet = XLSX.utils.json_to_sheet(
                filteredTransactions.map(t => ({
                    'Date': new Date(t.date).toLocaleDateString(),
                    'Description': t.description,
                    'Project': getProjectName(t.project_id),
                    'Mode': t.payment_mode.toUpperCase(),
                    'Amount (INR)': t.amount,
                    'Type': t.type
                }))
            );
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Petty Cash');
            XLSX.writeFile(workbook, 'petty_cash_report.xlsx');
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-xl font-bold tracking-tight">
                        My Petty Cash
                    </h1>
                    <p className="text-muted-foreground">Track daily settings and site expenses.</p>
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl border-border/50 shadow-sm">
                                <Download className="mr-2 h-4 w-4" /> Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                            <DropdownMenuItem onClick={() => exportPettyCashReport('pdf')}>
                                <FileText className="mr-2 h-4 w-4" /> Export as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportPettyCashReport('excel')}>
                                <File className="mr-2 h-4 w-4" /> Export as Excel
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="flex-1 sm:flex-none rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="rounded-xl border border-border/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 shadow-sm border-l-4 border-l-emerald-500 flex flex-col justify-center">
                    <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter mb-0.5">Total Inflow (Funded)</p>
                    <div className="text-sm font-bold text-emerald-900 dark:text-emerald-300 truncate leading-none">₹{formatCurrency(stats.income, true)}</div>
                </div>
                <div className="rounded-xl border border-border/50 bg-rose-50/50 dark:bg-rose-950/20 p-3 shadow-sm border-l-4 border-l-rose-500 flex flex-col justify-center">
                    <p className="text-[9px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-tighter mb-0.5">Total Outflow (Expenses)</p>
                    <div className="text-sm font-bold text-rose-900 dark:text-rose-300 truncate leading-none">₹{formatCurrency(stats.expense, true)}</div>
                </div>
                <div className={cn("rounded-xl border border-border/50 p-3 shadow-sm border-l-4 flex flex-col justify-center", stats.balance >= 0 ? "bg-green-50/50 dark:bg-green-950/20 border-l-green-500" : "bg-red-50/50 dark:bg-red-950/20 border-l-red-500")}>
                    <p className={cn("text-[9px] font-bold uppercase tracking-tighter mb-0.5", stats.balance >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>Current Balance</p>
                    <div className={cn("text-sm font-bold truncate leading-none", stats.balance >= 0 ? "text-green-900 dark:text-green-300" : "text-red-900 dark:text-red-300")}>{stats.balance > 0 ? '+' : ''}₹{formatCurrency(stats.balance, true)}</div>
                </div>
            </div>

            <div className="relative">
                <Input
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-14 bg-card border-border/50 shadow-sm rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-base"
                />
            </div>

            <TransactionsTable
                transactions={filteredTransactions}
                onEdit={handleEdit}
            />

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingTransaction ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
                        <DialogDescription>
                            {editingTransaction ? 'Modify the details of this expense.' : 'Record a new petty cash expense.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        <PettyCashForm
                            setOpen={setIsFormOpen}
                            transaction={editingTransaction}
                            defaultType='expense'
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
