'use client';

import { useState, useMemo } from 'react';
import { JournalForm } from '@/components/journal/journal-form';
import { JournalTable } from '@/components/journal/journal-table';
import { useAppState } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Filter, Download, PlusCircle, FilterX, FileText, File } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn, filterJournalEntries, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';

const ALL_LEDGERS = 'all-ledgers';
const ALL_USERS = 'all-users';
const ALL_MODES = 'all';

export default function JournalPage() {
    const { journal_entries, ledgers, users, isLoaded } = useAppState();
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);

    // Filters
    const [selectedLedger, setSelectedLedger] = useState<string>(ALL_LEDGERS);
    const [selectedUser, setSelectedUser] = useState<string>(ALL_USERS);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [paymentMode, setPaymentMode] = useState<string>(ALL_MODES);

    // Filter Local State
    const [localSelectedLedger, setLocalSelectedLedger] = useState<string>(ALL_LEDGERS);
    const [localSelectedUser, setLocalSelectedUser] = useState<string>(ALL_USERS);
    const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>();
    const [localPaymentMode, setLocalPaymentMode] = useState<string>(ALL_MODES);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const filteredEntries = useMemo(() => {
        if (!isLoaded) return [];
        return filterJournalEntries(journal_entries, {
            ledger_id: selectedLedger === ALL_LEDGERS ? undefined : selectedLedger,
            created_by: selectedUser === ALL_USERS ? undefined : selectedUser,
            dateRange: dateRange,
            payment_mode: paymentMode === ALL_MODES ? undefined : paymentMode as any,
        });
    }, [journal_entries, selectedLedger, selectedUser, dateRange, paymentMode, isLoaded]);

    const isFiltered = selectedLedger !== ALL_LEDGERS || selectedUser !== ALL_USERS || dateRange?.from || paymentMode !== ALL_MODES;

    const applyFilters = () => {
        setSelectedLedger(localSelectedLedger);
        setSelectedUser(localSelectedUser);
        setDateRange(localDateRange);
        setPaymentMode(localPaymentMode);
        setIsFilterOpen(false);
    };

    const clearFilters = () => {
        setLocalSelectedLedger(ALL_LEDGERS);
        setLocalSelectedUser(ALL_USERS);
        setLocalDateRange(undefined);
        setLocalPaymentMode(ALL_MODES);

        setSelectedLedger(ALL_LEDGERS);
        setSelectedUser(ALL_USERS);
        setDateRange(undefined);
        setPaymentMode(ALL_MODES);
        setIsFilterOpen(false);
    };

    const getLedgerName = (id: string) => ledgers.find((l) => l.id === id)?.name || 'N/A';
    const getUserName = (id: string) => users.find((u) => u.id === id)?.name || 'N/A';

    // Export Logic
    const exportToPDF = () => {
        if (filteredEntries.length === 0) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }

        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text("Journal Entries Report", 105, 20, { align: "center" });
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 28, { align: "center" });

        const tableData = filteredEntries.map(e => [
            new Date(e.date).toLocaleDateString(),
            e.description,
            e.debit_mode === 'ledger' ? getLedgerName(e.debit_ledger_id) : e.debit_mode.toUpperCase(),
            e.credit_mode === 'ledger' ? getLedgerName(e.credit_ledger_id) : e.credit_mode.toUpperCase(),
            formatCurrency(e.amount, true),
        ]);

        autoTable(doc, {
            startY: 35,
            head: [['Date', 'Description', 'Debit (Receiver)', 'Credit (Giver)', 'Amount']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [66, 66, 66] },
        });

        doc.save("journal_entries.pdf");
    };

    const exportToExcel = () => {
        if (filteredEntries.length === 0) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }
        const worksheet = XLSX.utils.json_to_sheet(filteredEntries.map(e => ({
            'Date': new Date(e.date).toLocaleDateString(),
            'Description': e.description,
            'Debit': e.debit_mode === 'ledger' ? getLedgerName(e.debit_ledger_id) : e.debit_mode.toUpperCase(),
            'Credit': e.credit_mode === 'ledger' ? getLedgerName(e.credit_ledger_id) : e.credit_mode.toUpperCase(),
            'Amount': e.amount,
            'Created By': getUserName(e.created_by)
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Journal");
        XLSX.writeFile(workbook, "journal_entries.xlsx");
    };

    const handleFormSuccess = () => {
        setIsFormOpen(false);
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
                    <p className="text-muted-foreground">
                        Record and track transfers between accounts and ledgers.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className={cn("rounded-xl border-border/50 shadow-sm flex-1 sm:flex-none", isFiltered && "bg-primary/5 border-primary/20 text-primary font-semibold")}>
                                <Filter className="mr-2 h-4 w-4" />
                                Filters
                                {isFiltered && <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-0 rounded-full h-5 px-1.5 min-w-[20px] justify-center text-[10px]">Active</Badge>}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-80 p-4 space-y-4 rounded-2xl shadow-xl border-border/50" align="end">
                            <div className="space-y-4">
                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Ledger</Label>
                                    <Combobox
                                        options={[{ value: ALL_LEDGERS, label: 'All Ledgers' }, ...ledgers.map(l => ({ value: l.id, label: l.name }))]}
                                        value={localSelectedLedger}
                                        onChange={setLocalSelectedLedger}
                                        placeholder="All Ledgers"
                                        searchPlaceholder="Search ledgers..."
                                        notFoundMessage="No ledgers found."
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Entry By</Label>
                                    <Combobox
                                        options={[{ value: ALL_USERS, label: 'All Users' }, ...users.map(u => ({ value: u.id, label: u.name }))]}
                                        value={localSelectedUser}
                                        onChange={setLocalSelectedUser}
                                        placeholder="All Users"
                                        searchPlaceholder="Search users..."
                                        notFoundMessage="No users found."
                                    />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Date Range</Label>
                                    <DatePickerWithRange date={localDateRange} setDate={setLocalDateRange} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Mode</Label>
                                    <Select value={localPaymentMode} onValueChange={setLocalPaymentMode}>
                                        <SelectTrigger className="rounded-xl border-border/50"><SelectValue placeholder="All Modes" /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value={ALL_MODES}>All Modes</SelectItem>
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="bank">Bank</SelectItem>
                                            <SelectItem value="ledger">Ledger</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DropdownMenuSeparator className="bg-border/50" />
                            <div className="flex items-center gap-3">
                                <Button variant="ghost" className="flex-1 rounded-xl text-muted-foreground" onClick={clearFilters} disabled={!isFiltered}><FilterX className="mr-2 h-4 w-4" />Reset</Button>
                                <Button className="flex-[1.5] rounded-xl bg-primary shadow-lg shadow-primary/20" onClick={applyFilters}>Apply Filters</Button>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="rounded-xl border-border/50 shadow-sm flex-1 sm:flex-none"><Download className="mr-2 h-4 w-4" /> Export</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                            <DropdownMenuItem onClick={exportToPDF} className="rounded-lg"><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToExcel} className="rounded-lg"><File className="mr-2 h-4 w-4" /> Excel</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 flex-1 sm:flex-none">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Add Entry</span>
                                <span className="sm:hidden">Add</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>New Journal Entry</DialogTitle>
                                <DialogDescription>Create a new double-entry record.</DialogDescription>
                            </DialogHeader>
                            <JournalForm onSuccess={handleFormSuccess} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="col-span-1">
                    <JournalTable entries={filteredEntries} />
                </div>
            </div>
        </div>
    );
}
