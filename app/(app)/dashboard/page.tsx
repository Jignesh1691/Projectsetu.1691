
'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    ArrowRightLeft,
    ReceiptText,
    ClipboardList,
    Camera,
    FileText,
    TrendingUp,
    TrendingDown,
    Wallet,
    Users,
    History,
    ArrowUp,
    ArrowDown,
    Scale,
    Layers,
} from 'lucide-react';
import { useAppState } from '@/hooks/use-store';
import { formatCurrency, cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getEffectiveTransaction, getEffectiveRecordable } from '@/lib/financial-utils';
import type { Transaction, Recordable, Task, Photo, Document as AppDocument, Hajari, Material, MaterialLedgerEntry } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';


const ActivityIcon = React.memo(({ itemType, item }: { itemType: string; item: any }) => {
    const iconMap: { [key: string]: React.ElementType } = {
        transaction: ArrowRightLeft,
        recordable: ReceiptText,
        task: ClipboardList,
        photo: Camera,
        document: FileText,
        hajari: Users,
        material: Layers,
        materialledgerentry: History,
    };
    const Icon = iconMap[itemType];

    let className = "text-muted-foreground";
    if (itemType === 'transaction') {
        className = item.type === 'income' ? 'text-green-500' : 'text-red-500';
    } else if (itemType === 'recordable') {
        className = item.type === 'asset' ? 'text-green-500' : 'text-red-500';
    }

    return Icon ? <Icon className={cn("h-4 w-4", className)} /> : null;
});
ActivityIcon.displayName = 'ActivityIcon';

const RecentActivityItem = React.memo(({ item, hasMounted }: { item: any; hasMounted: boolean; }) => {
    const getActivityTitle = (item: any) => {
        switch (item.itemType) {
            case 'transaction':
                const tx = item as Transaction;
                return `${tx.type === 'income' ? 'Income' : 'Expense'} of ${formatCurrency(tx.amount)}`;
            case 'recordable':
                const rec = item as Recordable;
                return `${rec.type === 'asset' ? 'Receivable' : 'Payable'} of ${formatCurrency(rec.amount)} logged`;
            case 'task':
                return `Task added: "${item.title}"`;
            case 'photo':
                return 'Photo uploaded';
            case 'document':
                return `Document added: "${item.document_name}"`;
            case 'hajari':
                return `Hajari settled for ${formatCurrency(item.upad)}`;
            case 'material':
                return `New material added: ${item.name}`;
            case 'materialledgerentry':
                return `${item.type === 'in' ? 'Stock In' : 'Stock Out'} of ${item.quantity} units`;
            default:
                return 'New activity';
        }
    };

    const { isLoaded } = useAppState();

    return (
        <div className="flex items-center gap-3 md:gap-4 lg:gap-5">
            <Avatar className="h-8 w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 border border-border/50 shadow-sm">
                <AvatarFallback className="bg-background/50 lg:bg-background/80">
                    <ActivityIcon itemType={item.itemType} item={item} />
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 space-y-0.5 md:space-y-1 lg:space-y-1.5">
                <p className="text-xs md:text-sm lg:text-[15px] font-semibold truncate leading-none lg:leading-tight tracking-tight">{getActivityTitle(item)}</p>
                <p className="text-[10px] md:text-xs lg:text-sm text-muted-foreground font-medium">
                    {hasMounted ? formatDistanceToNow(item.date, { addSuffix: true }) : '...'}
                </p>
            </div>
            {(item as any).amount && (
                <div className={cn(
                    "ml-auto text-xs md:text-sm lg:text-base font-bold tracking-tight",
                    (item.itemType === 'transaction' && (item as Transaction).type === 'income') || (item.itemType === 'recordable' && (item as Recordable).type === 'asset') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}>
                    {hasMounted ? formatCurrency((item as any).amount).replace(/\.00$/, '') : '...'}
                </div>
            )}
        </div>
    );
});
RecentActivityItem.displayName = 'RecentActivityItem';


export default function DashboardPage() {
    const { appUser, projects, transactions, recordables, tasks, photos, documents, hajari_records, materials, material_ledger, isLoaded, records_loaded, transactions_loaded } = useAppState();
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);



    const recentActivity = useMemo(() => {
        if (!isLoaded || !records_loaded || !transactions_loaded) return [];
        const allItems = [
            ...transactions.map(item => ({ ...item, itemType: 'transaction' as const, date: new Date(item.date) })),
            ...recordables.map(item => ({ ...item, itemType: 'recordable' as const, date: new Date(item.due_date) })),
            ...tasks.map(item => ({ ...item, itemType: 'task' as const, date: item.due_date ? new Date(item.due_date) : new Date(parseInt(item.id.split('_')[1], 10)) })),
            ...photos.map(item => ({ ...item, itemType: 'photo' as const, date: new Date(item.created_at) })),
            ...documents.map(item => ({ ...item, itemType: 'document' as const, date: new Date(item.created_at) })),
            ...hajari_records.map(item => ({ ...item, itemType: 'hajari' as const, date: new Date(item.date) })),
            ...materials.map(item => ({ ...item, itemType: 'material' as const, date: new Date() })),
            ...material_ledger.map(item => ({ ...item, itemType: 'materialledgerentry' as const, date: new Date(item.date) })),
        ];

        return allItems
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 5);
    }, [transactions, recordables, tasks, photos, documents, hajari_records, materials, material_ledger, isLoaded]);

    const { totalIncome, totalExpense, netBalance, totalReceivable, totalPayable, netOutstanding } = useMemo(() => {
        if (!isLoaded || !records_loaded || !transactions_loaded) return { totalIncome: 0, totalExpense: 0, netBalance: 0, totalReceivable: 0, totalPayable: 0, netOutstanding: 0 };

        const effectiveTransactions = transactions
            .map(t => getEffectiveTransaction(t))
            .filter((t): t is Transaction => t !== null);

        const effectiveRecords = recordables
            .map(r => getEffectiveRecordable(r))
            .filter((r): r is Recordable => r !== null);

        const totalIncome = effectiveTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = effectiveTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const totalReceivable = effectiveRecords.filter(t => t.type === 'asset' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
        const totalPayable = effectiveRecords.filter(t => t.type === 'liability' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);

        return {
            totalIncome,
            totalExpense,
            netBalance: totalIncome - totalExpense,
            totalReceivable,
            totalPayable,
            netOutstanding: totalReceivable - totalPayable
        }
    }, [transactions, recordables, isLoaded, records_loaded, transactions_loaded]);


    const transactionOverviewItems = [
        { Icon: TrendingUp, title: "Total Income", value: formatCurrency(totalIncome), color: "text-green-600" },
        { Icon: TrendingDown, title: "Total Expense", value: formatCurrency(totalExpense), color: "text-red-600" },
        { Icon: Scale, title: "Net Balance", value: formatCurrency(netBalance), color: netBalance >= 0 ? "text-green-600" : "text-red-600" },
    ];

    const outstandingOverviewItems = [
        { Icon: ArrowUp, title: "Receivable", value: formatCurrency(totalReceivable), color: "text-green-600" },
        { Icon: ArrowDown, title: "Payable", value: formatCurrency(totalPayable), color: "text-red-600" },
        { Icon: Scale, title: "Net Outstanding", value: formatCurrency(netOutstanding), color: netOutstanding >= 0 ? "text-green-600" : "text-red-600" },
    ];


    return (
        <div className="space-y-3 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 items-start">

                {/* Left Column: Stats & Meters */}
                <div className="space-y-4 lg:space-y-8 lg:col-span-2">
                    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6">
                        <div className="relative group p-[1px] bg-gradient-to-br from-primary/20 via-primary/50 to-amber-600/40 rounded-2xl lg:rounded-3xl shadow-lg shadow-primary/5 transition-all duration-500 hover:shadow-primary/10 hover:from-primary/40 hover:to-amber-600/60 lg:hover:scale-[1.02]">
                            <div className="absolute -inset-1 bg-gradient-to-br from-primary/30 to-amber-600/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-40 transition duration-700 hidden lg:block"></div>
                            <Card className="relative h-full w-full border-0 shadow-none rounded-[calc(1rem-1px)] lg:rounded-[calc(1.5rem-1px)] overflow-hidden bg-card/80 lg:bg-card/90 backdrop-blur-xl transition-all duration-300">
                                <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4 lg:p-6 pb-1 md:pb-1 lg:pb-2">
                                    <div className="space-y-0.5 lg:space-y-2">
                                        <CardTitle className="text-xs lg:text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Transactions</CardTitle>
                                        <div className={cn("text-base md:text-2xl lg:text-4xl font-medium tracking-tighter", netBalance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                            {netBalance > 0 ? '+' : ''}{formatCurrency(netBalance).replace(/\.00$/, '')}
                                        </div>
                                    </div>
                                    <div className="h-8 w-8 md:h-11 md:w-11 lg:h-14 lg:w-14 bg-primary/10 border border-primary/20 rounded-lg md:rounded-2xl flex items-center justify-center lg:shadow-inner bg-gradient-to-br from-primary/20 to-transparent">
                                        <Wallet className="h-4 w-4 md:h-5 md:w-5 lg:h-7 lg:w-7 text-primary" />
                                    </div>
                                </CardHeader>
                                <Separator className="my-2 opacity-50 hidden lg:block" />
                                <CardContent className="p-3 md:p-4 lg:p-6 pt-1 md:pt-2 lg:pt-2">
                                    <div className="grid grid-cols-1 gap-1.5 md:gap-3 lg:gap-6">
                                        <div className="flex items-center justify-between md:flex-col md:items-start lg:flex-row lg:items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center hidden lg:flex border border-green-500/20 shadow-sm">
                                                    <ArrowUp className="w-4 h-4 text-green-600" />
                                                </div>
                                                <p className="text-xs lg:text-sm font-bold text-muted-foreground/60 uppercase tracking-tighter md:mb-0.5 lg:mb-0">Income</p>
                                            </div>
                                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                <ArrowUp className="w-2.5 h-2.5 md:w-3 md:h-3 lg:hidden" />
                                                <p className="font-extrabold text-[11px] md:text-sm lg:text-xl tracking-tight">{formatCurrency(totalIncome).replace(/\.00$/, '')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:flex-col md:items-start lg:flex-row lg:items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center hidden lg:flex border border-red-500/20 shadow-sm">
                                                    <ArrowDown className="w-4 h-4 text-red-600" />
                                                </div>
                                                <p className="text-xs lg:text-sm font-bold text-muted-foreground/60 uppercase tracking-tighter md:mb-0.5 lg:mb-0">Expense</p>
                                            </div>
                                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                <ArrowDown className="w-2.5 h-2.5 md:w-3 md:h-3 lg:hidden" />
                                                <p className="font-extrabold text-[11px] md:text-sm lg:text-xl tracking-tight">{formatCurrency(totalExpense).replace(/\.00$/, '')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="relative group p-[1px] bg-gradient-to-bl from-amber-500/20 via-amber-500/50 to-primary/40 rounded-2xl lg:rounded-3xl shadow-lg shadow-amber-500/5 transition-all duration-500 hover:shadow-amber-500/10 hover:from-amber-500/40 hover:to-primary/60 lg:hover:scale-[1.02]">
                            <div className="absolute -inset-1 bg-gradient-to-bl from-amber-500/30 to-primary/30 rounded-3xl blur-xl opacity-0 group-hover:opacity-40 transition duration-700 hidden lg:block"></div>
                            <Card className="relative h-full w-full border-0 shadow-none rounded-[calc(1rem-1px)] lg:rounded-[calc(1.5rem-1px)] overflow-hidden bg-card/80 lg:bg-card/90 backdrop-blur-xl transition-all duration-300">
                                <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4 lg:p-6 pb-1 md:pb-1 lg:pb-2">
                                    <div className="space-y-0.5 lg:space-y-2">
                                        <CardTitle className="text-xs lg:text-sm font-bold uppercase tracking-widest text-muted-foreground/80">Outstanding</CardTitle>
                                        <div className={cn("text-base md:text-2xl lg:text-4xl font-medium tracking-tighter", netOutstanding >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                            {netOutstanding > 0 ? '+' : ''}{formatCurrency(netOutstanding).replace(/\.00$/, '')}
                                        </div>
                                    </div>
                                    <div className="h-8 w-8 md:h-11 md:w-11 lg:h-14 lg:w-14 bg-amber-500/10 border border-amber-500/20 rounded-lg md:rounded-2xl flex items-center justify-center lg:shadow-inner bg-gradient-to-bl from-amber-500/20 to-transparent">
                                        <Scale className="h-4 w-4 md:h-5 md:w-5 lg:h-7 lg:w-7 text-amber-600" />
                                    </div>
                                </CardHeader>
                                <Separator className="my-2 opacity-50 hidden lg:block" />
                                <CardContent className="p-3 md:p-4 lg:p-6 pt-1 md:pt-2 lg:pt-2">
                                    <div className="grid grid-cols-1 gap-1.5 md:gap-3 lg:gap-6">
                                        <div className="flex items-center justify-between md:flex-col md:items-start lg:flex-row lg:items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center hidden lg:flex border border-green-500/20 shadow-sm">
                                                    <ArrowUp className="w-4 h-4 text-green-600" />
                                                </div>
                                                <p className="text-xs lg:text-sm font-bold text-muted-foreground/60 uppercase tracking-tighter md:mb-0.5 lg:mb-0">Receivable</p>
                                            </div>
                                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                <ArrowUp className="w-2.5 h-2.5 md:w-3 md:h-3 lg:hidden" />
                                                <p className="font-extrabold text-[11px] md:text-sm lg:text-xl tracking-tight">{formatCurrency(totalReceivable).replace(/\.00$/, '')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:flex-col md:items-start lg:flex-row lg:items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center hidden lg:flex border border-red-500/20 shadow-sm">
                                                    <ArrowDown className="w-4 h-4 text-red-600" />
                                                </div>
                                                <p className="text-xs lg:text-sm font-bold text-muted-foreground/60 uppercase tracking-tighter md:mb-0.5 lg:mb-0">Payable</p>
                                            </div>
                                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                <ArrowDown className="w-2.5 h-2.5 md:w-3 md:h-3 lg:hidden" />
                                                <p className="font-extrabold text-[11px] md:text-sm lg:text-xl tracking-tight">{formatCurrency(totalPayable).replace(/\.00$/, '')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Right Column: Recent Activity Feed */}
                <div className="lg:col-span-1 lg:h-full">
                    <div className="relative group h-full p-[1px] bg-gradient-to-b from-muted-foreground/10 to-transparent lg:from-muted-foreground/20 lg:to-muted-foreground/5 rounded-2xl lg:rounded-3xl transition-all duration-500">
                        <Card className="h-full border-0 shadow-none rounded-[calc(1rem-1px)] lg:rounded-[calc(1.5rem-1px)] overflow-hidden bg-card/30 lg:bg-card/40 lg:backdrop-blur-xl flex flex-col">
                            <CardHeader className="p-3 md:p-4 lg:p-6 border-b border-border/40 bg-muted/20 lg:bg-muted/10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm md:text-base lg:text-lg font-bold tracking-tight">Recent Activity</CardTitle>
                                        <CardDescription className="text-xs lg:text-sm">Latest updates across projects</CardDescription>
                                    </div>
                                    <History className="h-4 w-4 text-muted-foreground/50 hidden lg:block" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-auto">
                                {!isLoaded || !records_loaded || !transactions_loaded ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                        <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest">Initialising...</p>
                                    </div>
                                ) : recentActivity.length > 0 ? (
                                    <div className="divide-y divide-border/30">
                                        {recentActivity.map((item, i) => (
                                            <div key={item.id} className="p-3 md:p-4 lg:p-5 hover:bg-muted/30 lg:hover:bg-muted/50 transition-colors">
                                                <RecentActivityItem item={item} hasMounted={hasMounted} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                                        <div className="w-12 h-12 bg-muted/50 rounded-full flex items-center justify-center">
                                            <History className="w-5 h-5 text-muted-foreground/30" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-foreground text-sm font-semibold">Clean workspace</p>
                                            <p className="text-muted-foreground text-xs">No recent activity to show.</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
