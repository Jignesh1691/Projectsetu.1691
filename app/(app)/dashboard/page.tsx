
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
import type { Transaction, Recordable, Task, Photo, Document as AppDocument, Hajari, Material, MaterialLedgerEntry } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';


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
        className = item.type === 'income' ? 'text-green-500' : 'text-red-500';
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
                return `${rec.type === 'income' ? 'Receivable' : 'Payable'} of ${formatCurrency(rec.amount)} logged`;
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
                    (item.itemType === 'transaction' && (item as Transaction).type === 'income') || (item.itemType === 'recordable' && (item as Recordable).type === 'income') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                )}>
                    {hasMounted ? formatCurrency((item as any).amount).replace(/\.00$/, '') : '...'}
                </div>
            )}
        </div>
    );
});
RecentActivityItem.displayName = 'RecentActivityItem';


export default function DashboardPage() {
    const { appUser, projects, transactions, recordables, tasks, photos, documents, hajari_records, materials, material_ledger, isLoaded } = useAppState();
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);



    const recentActivity = useMemo(() => {
        if (!isLoaded) return [];
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
        if (!isLoaded) return { totalIncome: 0, totalExpense: 0, netBalance: 0, totalReceivable: 0, totalPayable: 0, netOutstanding: 0 };
        const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const totalReceivable = recordables.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalPayable = recordables.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        return {
            totalIncome,
            totalExpense,
            netBalance: totalIncome - totalExpense,
            totalReceivable,
            totalPayable,
            netOutstanding: totalReceivable - totalPayable,
        }
    }, [transactions, recordables, isLoaded]);


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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Main Stats Column */}
                <div className="lg:col-span-8 space-y-4 md:space-y-6">
                    <div className="grid grid-cols-2 gap-3 md:gap-6">
                        {/* Transactions Card */}
                        <Card className="rounded-2xl md:rounded-[2rem] border-0 shadow-xl shadow-primary/5 bg-card/50 backdrop-blur-xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-3 md:p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Wallet className="h-6 w-6 md:h-12 md:w-12 text-primary" />
                            </div>
                            <CardHeader className="p-4 md:p-8 pb-2 md:pb-4">
                                <CardTitle className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Transactions</CardTitle>
                                <div className={cn("text-xl md:text-4xl lg:text-5xl font-black mt-1 md:mt-2 tracking-tighter", netBalance >= 0 ? "text-green-600" : "text-red-600")}>
                                    {hasMounted ? formatCurrency(netBalance).replace(/\.00$/, '') : '...'}
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 md:p-8 pt-0 space-y-2 md:space-y-4">
                                <Separator className="bg-border/40" />
                                <div className="space-y-2 md:space-y-4">
                                    <div className="flex items-center justify-between group/row">
                                        <div className="flex items-center gap-1.5 md:gap-3">
                                            <div className="p-1 md:p-2 rounded-lg md:xl bg-green-500/10 text-green-600">
                                                <ArrowUp className="h-3 w-3 md:h-4 md:w-4" />
                                            </div>
                                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Income</span>
                                        </div>
                                        <span className="text-xs md:text-lg font-bold text-green-600">{hasMounted ? formatCurrency(totalIncome).replace(/\.00$/, '') : '...'}</span>
                                    </div>
                                    <div className="flex items-center justify-between group/row">
                                        <div className="flex items-center gap-1.5 md:gap-3">
                                            <div className="p-1 md:p-2 rounded-lg md:xl bg-red-500/10 text-red-600">
                                                <ArrowDown className="h-3 w-3 md:h-4 md:w-4" />
                                            </div>
                                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Expense</span>
                                        </div>
                                        <span className="text-xs md:text-lg font-bold text-red-600">{hasMounted ? formatCurrency(totalExpense).replace(/\.00$/, '') : '...'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Outstanding Card */}
                        <Card className="rounded-2xl md:rounded-[2rem] border-0 shadow-xl shadow-amber-500/5 bg-card/50 backdrop-blur-xl overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-3 md:p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Scale className="h-6 w-6 md:h-12 md:w-12 text-amber-500" />
                            </div>
                            <CardHeader className="p-4 md:p-8 pb-2 md:pb-4">
                                <CardTitle className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Outstanding</CardTitle>
                                <div className={cn("text-xl md:text-4xl lg:text-5xl font-black mt-1 md:mt-2 tracking-tighter", netOutstanding >= 0 ? "text-green-600" : "text-red-500")}>
                                    {hasMounted ? formatCurrency(netOutstanding).replace(/\.00$/, '') : '...'}
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 md:p-8 pt-0 space-y-2 md:space-y-4">
                                <Separator className="bg-border/40" />
                                <div className="space-y-2 md:space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 md:gap-3">
                                            <div className="p-1 md:p-2 rounded-lg md:xl bg-green-500/10 text-green-600">
                                                <ArrowUp className="h-3 w-3 md:h-4 md:w-4" />
                                            </div>
                                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Receivable</span>
                                        </div>
                                        <span className="text-xs md:text-lg font-bold text-green-600">{hasMounted ? formatCurrency(totalReceivable).replace(/\.00$/, '') : '...'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 md:gap-3">
                                            <div className="p-1 md:p-2 rounded-lg md:xl bg-red-500/10 text-red-600">
                                                <ArrowDown className="h-3 w-3 md:h-4 md:w-4" />
                                            </div>
                                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Payable</span>
                                        </div>
                                        <span className="text-xs md:text-lg font-bold text-red-600">{hasMounted ? formatCurrency(totalPayable).replace(/\.00$/, '') : '...'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Sidebar Column: Recent Activity */}
                <div className="lg:col-span-4 lg:sticky lg:top-6">
                    <Card className="rounded-[2rem] border-0 shadow-xl shadow-muted/5 bg-card/30 lg:bg-card/40 backdrop-blur-xl overflow-hidden flex flex-col min-h-[500px]">
                        <div className="h-16 flex items-center px-8 border-b border-border/40 bg-muted/5">
                            <div className="flex items-center justify-between w-full">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-bold tracking-tight">Recent Activity</CardTitle>
                                    <CardDescription className="text-xs">Latest updates across projects</CardDescription>
                                </div>
                                <History className="h-5 w-5 text-muted-foreground/40" />
                            </div>
                        </div>
                        <CardContent className="p-0 flex-1 overflow-auto">
                            {!isLoaded ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Loading activity...</p>
                                </div>
                            ) : recentActivity.length > 0 ? (
                                <div className="divide-y divide-border/20">
                                    {recentActivity.map((item, i) => (
                                        <div key={item.id} className="p-6 transition-all hover:bg-muted/30">
                                            <RecentActivityItem item={item} hasMounted={hasMounted} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                                    <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center">
                                        <History className="w-6 h-6 text-muted-foreground/20" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-bold text-sm tracking-tight text-foreground/80">Clean Workspace</p>
                                        <p className="text-xs text-muted-foreground">No recent activity found.</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
