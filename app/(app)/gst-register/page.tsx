'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, FileText, Search, Calendar as CalendarIcon, FilterX } from 'lucide-react';
import { useAppState } from '@/hooks/use-store';
import { formatCurrency, formatGSTIN } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function GSTRegisterPage() {
    const { recordables, ledgers, projects } = useAppState();
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });
    const [searchTerm, setSearchTerm] = useState('');

    const gstRecords = useMemo(() => {
        return recordables.filter(r =>
            r.invoice_number &&
            r.approval_status === 'approved' &&
            (!dateRange?.from || new Date(r.invoice_date || r.due_date) >= dateRange.from) &&
            (!dateRange?.to || new Date(r.invoice_date || r.due_date) <= dateRange.to)
        );
    }, [recordables, dateRange]);

    const salesInvoices = useMemo(() => gstRecords.filter(r => r.type === 'income'), [gstRecords]);
    const purchaseInvoices = useMemo(() => gstRecords.filter(r => r.type === 'expense'), [gstRecords]);

    const getLedger = (id: string) => ledgers.find(l => l.id === id);

    const exportToExcel = (type: 'sales' | 'purchase') => {
        const invoices = type === 'sales' ? salesInvoices : purchaseInvoices;
        const data = invoices.map(r => {
            const ledger = getLedger(r.ledger_id);
            return {
                'Invoice No': r.invoice_number,
                'Invoice Date': r.invoice_date ? format(new Date(r.invoice_date), 'dd/MM/yyyy') : '',
                'Party Name': ledger?.name || 'N/A',
                'GSTIN': ledger?.gst_number || 'Unregistered',
                'Taxable Amount': r.taxable_amount || 0,
                'CGST': r.cgst_amount || 0,
                'SGST': r.sgst_amount || 0,
                'IGST': r.igst_amount || 0,
                'Cess': r.cess_amount || 0,
                'Total GST': r.total_gst_amount || 0,
                'Total Amount': r.amount,
                'Project': projects.find(p => p.id === r.project_id)?.name || 'N/A'
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${type === 'sales' ? 'Sales' : 'Purchase'} Register`);
        XLSX.writeFile(wb, `gst_${type}_register_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    const RegisterTable = ({ invoices }: { invoices: typeof gstRecords }) => (
        <div className="rounded-xl border border-border/50 overflow-hidden bg-background">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead className="w-[100px]">Inv No.</TableHead>
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead>Party / GSTIN</TableHead>
                        <TableHead className="text-right">Taxable</TableHead>
                        <TableHead className="text-right">GST</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoices.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                No invoices found for this period.
                            </TableCell>
                        </TableRow>
                    ) : (
                        invoices.map((r) => {
                            const ledger = getLedger(r.ledger_id);
                            return (
                                <TableRow key={r.id}>
                                    <TableCell className="font-mono text-xs">{r.invoice_number}</TableCell>
                                    <TableCell className="text-xs">{r.invoice_date ? format(new Date(r.invoice_date), 'dd/MM/yy') : '-'}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-xs">{ledger?.name}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase">{ledger?.gst_number || 'Unregistered'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-xs font-medium">{formatCurrency(r.taxable_amount || 0)}</TableCell>
                                    <TableCell className="text-right text-xs text-muted-foreground">{formatCurrency(r.total_gst_amount || 0)}</TableCell>
                                    <TableCell className="text-right text-xs font-bold text-primary">{formatCurrency(r.amount)}</TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">GST Register</h1>
                    <p className="text-sm text-muted-foreground">Monthly compliance report for sales and purchases.</p>
                </div>

                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="rounded-xl border-border/50">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                            {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Pick a date</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setDateRange(undefined)}>
                        <FilterX className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden border-l-4 border-l-primary/50">
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-[10px] uppercase font-bold tracking-wider">Total Sales (Taxable)</CardDescription>
                        <CardTitle className="text-xl text-primary">{formatCurrency(salesInvoices.reduce((sum, r) => sum + (r.taxable_amount || 0), 0))}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden border-l-4 border-l-amber-500/50">
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-[10px] uppercase font-bold tracking-wider">Output GST (Collected)</CardDescription>
                        <CardTitle className="text-xl text-amber-600">{formatCurrency(salesInvoices.reduce((sum, r) => sum + (r.total_gst_amount || 0), 0))}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden border-l-4 border-l-green-500/50">
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-[10px] uppercase font-bold tracking-wider">Input Tax Credit (ITC)</CardDescription>
                        <CardTitle className="text-xl text-green-600">{formatCurrency(purchaseInvoices.reduce((sum, r) => sum + (r.total_gst_amount || 0), 0))}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Tabs defaultValue="sales" className="w-full">
                <div className="flex items-center justify-between mb-2">
                    <TabsList className="rounded-xl bg-muted/50 p-1">
                        <TabsTrigger value="sales" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Sales</TabsTrigger>
                        <TabsTrigger value="purchase" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Purchases</TabsTrigger>
                    </TabsList>

                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={() => exportToExcel('sales')}>
                            <Download className="mr-2 h-4 w-4" /> Export Excel
                        </Button>
                    </div>
                </div>

                <TabsContent value="sales">
                    <RegisterTable invoices={salesInvoices} />
                </TabsContent>
                <TabsContent value="purchase">
                    <RegisterTable invoices={purchaseInvoices} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
