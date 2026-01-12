
'use client';

import { useAppState } from '@/hooks/use-store';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { JournalActions } from './journal-actions';

interface JournalTableProps {
    entries: any[];
}

export function JournalTable({ entries }: JournalTableProps) {
    // Sort by date desc
    const sortedEntries = [...entries].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const getAccountName = (mode: string, ledger: any) => {
        if (mode === 'cash') return 'Cash Account';
        if (mode === 'bank') return 'Bank Account';
        return ledger ? ledger.name : 'Unknown Ledger';
    };

    if (sortedEntries.length === 0) {
        return (
            <Card className="border-border/50 shadow-sm rounded-2xl">
                <CardHeader>
                    <CardTitle>Recent Entries</CardTitle>
                </CardHeader>
                <CardContent className="text-center py-12 text-muted-foreground">
                    No journal entries found.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                <h3 className="text-lg font-bold">Recent Entries</h3>
                {sortedEntries.map((entry) => (
                    <Card key={entry.id} className="border-border/50 shadow-sm rounded-xl">
                        <CardContent className="p-4 space-y-3">
                            <div className="flex justify-between items-start gap-2">
                                <div className="space-y-1 flex-1">
                                    <p className="font-semibold text-sm line-clamp-1">{entry.description}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(entry.date), 'dd MMM yyyy')} • By {entry.creator?.name || 'Unknown'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right font-bold text-base">
                                        ₹{entry.amount.toLocaleString('en-IN')}
                                    </div>
                                    <JournalActions entry={entry} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3 mt-1">
                                <div>
                                    <span className="text-muted-foreground block mb-0.5 uppercase tracking-wider text-[10px]">Debit (Receiver)</span>
                                    <span className="font-medium text-emerald-600 block truncate">
                                        {getAccountName(entry.debit_mode, entry.debit_ledger)}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-muted-foreground block mb-0.5 uppercase tracking-wider text-[10px]">Credit (Giver)</span>
                                    <span className="font-medium text-red-600 block truncate">
                                        {getAccountName(entry.credit_mode, entry.credit_ledger)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Desktop View */}
            <Card className="hidden md:block border-border/50 shadow-sm rounded-2xl">
                <CardHeader>
                    <CardTitle>Recent Entries</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="pl-6">Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Debit (Receiver)</TableHead>
                                <TableHead>Credit (Giver)</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="pr-6">Entry By</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedEntries.map((entry) => (
                                <TableRow key={entry.id} className="hover:bg-muted/50">
                                    <TableCell className="pl-6">{format(new Date(entry.date), 'dd MMM yyyy')}</TableCell>
                                    <TableCell className="font-medium">{entry.description}</TableCell>
                                    <TableCell className="font-medium text-emerald-600">
                                        {getAccountName(entry.debit_mode, entry.debit_ledger)}
                                    </TableCell>
                                    <TableCell className="font-medium text-red-600">
                                        {getAccountName(entry.credit_mode, entry.credit_ledger)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        ₹{entry.amount.toLocaleString('en-IN')}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground pr-6">
                                        {entry.creator?.name || 'Unknown'}
                                    </TableCell>
                                    <TableCell>
                                        <JournalActions entry={entry} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
