
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, ReceiptText, Download, FilterX, File, FileText, Filter, View } from 'lucide-react';
import { useAppState } from '@/hooks/use-store';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { Recordable, PaymentMode } from '@/lib/definitions';
import { RecordForm } from '@/components/record-form';
import { RecordsTable } from '@/components/records-table';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { filterRecordables, formatCurrency, cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';


const ALL_PROJECTS = 'all-projects';
const ALL_LEDGERS = 'all-ledgers';
const ALL_PAYMENT_MODES = 'all';
const ALL_USERS = 'all-users';

export default function RecordsPage() {
  const { recordables, currentUser, userVisibleProjects, projects, ledgers, users, isLoaded } = useAppState();
  const { toast } = useToast();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Recordable | undefined>(undefined);
  const [viewingRecord, setViewingRecord] = useState<Recordable | undefined>(undefined);

  // Filter states
  const [selectedProject, setSelectedProject] = useState<string>(ALL_PROJECTS);
  const [selectedLedger, setSelectedLedger] = useState<string>(ALL_LEDGERS);
  const [selectedUser, setSelectedUser] = useState<string>(ALL_USERS);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [paymentMode, setPaymentMode] = useState<string>(ALL_PAYMENT_MODES);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Local states for dropdown before applying
  const [localSelectedProject, setLocalSelectedProject] = useState<string>(ALL_PROJECTS);
  const [localSelectedLedger, setLocalSelectedLedger] = useState<string>(ALL_LEDGERS);
  const [localSelectedUser, setLocalSelectedUser] = useState<string>(ALL_USERS);
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>();
  const [localPaymentMode, setLocalPaymentMode] = useState<string>(ALL_PAYMENT_MODES);
  const [localSelectedType, setLocalSelectedType] = useState<string>('all');
  const [localSelectedStatus, setLocalSelectedStatus] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const userVisibleLedgers = useMemo(() => {
    return ledgers;
  }, [ledgers]);

  const filteredRecords = useMemo(() => {
    if (!isLoaded) return [];
    let records = currentUser?.role === 'admin'
      ? recordables
      : recordables.filter(r => userVisibleProjects.some(p => p.id === r.project_id));

    const filtered = filterRecordables(records, {
      project_id: selectedProject === ALL_PROJECTS ? undefined : selectedProject,
      ledger_id: selectedLedger === ALL_LEDGERS ? undefined : selectedLedger,
      created_by: selectedUser === ALL_USERS ? undefined : selectedUser,
      dateRange: dateRange,
      payment_mode: paymentMode === ALL_PAYMENT_MODES ? undefined : paymentMode as PaymentMode,
      type: selectedType === 'all' ? undefined : selectedType as 'asset' | 'liability',
      status: selectedStatus === 'all' ? undefined : selectedStatus as 'pending' | 'paid',
    });

    return [...filtered].sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  }, [recordables, currentUser, userVisibleProjects, selectedProject, selectedLedger, dateRange, paymentMode, selectedUser, selectedType, selectedStatus, isLoaded]);

  const handleAddClick = () => {
    setEditingRecord(undefined);
    setSheetOpen(true);
  };

  const handleEdit = (record: Recordable) => {
    setEditingRecord(record);
    setSheetOpen(true);
  };

  const applyFilters = () => {
    setSelectedProject(localSelectedProject);
    setSelectedLedger(localSelectedLedger);
    setSelectedUser(localSelectedUser);
    setDateRange(localDateRange);
    setPaymentMode(localPaymentMode);
    setSelectedType(localSelectedType);
    setSelectedStatus(localSelectedStatus);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setLocalSelectedProject(ALL_PROJECTS);
    setLocalSelectedLedger(ALL_LEDGERS);
    setLocalSelectedUser(ALL_USERS);
    setLocalDateRange(undefined);
    setLocalPaymentMode(ALL_PAYMENT_MODES);
    setLocalSelectedType('all');
    setLocalSelectedStatus('all');

    setSelectedProject(ALL_PROJECTS);
    setSelectedLedger(ALL_LEDGERS);
    setSelectedUser(ALL_USERS);
    setDateRange(undefined);
    setPaymentMode(ALL_PAYMENT_MODES);
    setSelectedType('all');
    setSelectedStatus('all');
    setIsFilterOpen(false);
  };

  const isFiltered = selectedProject !== ALL_PROJECTS || selectedLedger !== ALL_LEDGERS || selectedUser !== ALL_USERS || dateRange?.from || paymentMode !== ALL_PAYMENT_MODES || selectedType !== 'all' || selectedStatus !== 'all';

  const summary = useMemo(() => {
    if (!isLoaded) return { totalReceivable: 0, totalPayable: 0, netOutstanding: 0 };
    const totalReceivable = filteredRecords.filter(t => t.type === 'asset' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
    const totalPayable = filteredRecords.filter(t => t.type === 'liability' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
    return {
      totalReceivable,
      totalPayable,
      netOutstanding: totalReceivable - totalPayable
    };
  }, [filteredRecords, isLoaded]);

  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name || 'N/A';
  const getLedgerName = (id: string) => ledgers.find((l) => l.id === id)?.name || 'N/A';
  const getUserName = (id: string) => users.find((u) => u.id === id)?.name || 'N/A';

  const exportToPDF = () => {
    if (filteredRecords.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageCenter = pageWidth / 2;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Outstandings Report", pageCenter, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageCenter, 28, { align: "center" });

    // Filter Details
    let filterStartY = 35;
    if (isFiltered) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Active Filters", 14, filterStartY);

      let filterText = [];
      if (selectedProject !== ALL_PROJECTS) filterText.push(`Project: ${getProjectName(selectedProject)}`);
      if (selectedLedger !== ALL_LEDGERS) filterText.push(`Ledger: ${getLedgerName(selectedLedger)}`);
      if (selectedUser !== ALL_USERS) filterText.push(`User: ${getUserName(selectedUser)}`);
      if (dateRange?.from) filterText.push(`Date: ${new Date(dateRange.from).toLocaleDateString()} - ${dateRange.to ? new Date(dateRange.to).toLocaleDateString() : 'Present'}`);
      if (paymentMode !== ALL_PAYMENT_MODES) filterText.push(`Mode: ${paymentMode}`);
      if (selectedType !== 'all') filterText.push(`Type: ${selectedType}`);
      if (selectedStatus !== 'all') filterText.push(`Status: ${selectedStatus}`);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text(filterText.join(' | '), 14, filterStartY + 5);
      filterStartY += 12;
    }

    // Summary Calculations
    const { totalReceivable, totalPayable, netOutstanding } = (() => {
      if (!isLoaded) return { totalReceivable: 0, totalPayable: 0, netOutstanding: 0 };
      const totalReceivable = filteredRecords.filter(t => t.type === 'asset' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
      const totalPayable = filteredRecords.filter(t => t.type === 'liability' && t.status === 'pending').reduce((sum, t) => sum + t.amount, 0);
      return {
        totalReceivable,
        totalPayable,
        netOutstanding: totalReceivable - totalPayable
      }
    })();

    // Financial Overview Section with Cards
    const overviewY = filterStartY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text("Financial Overview", 14, overviewY);

    const cardY = overviewY + 5;
    const cardGap = 6;
    const availableWidth = doc.internal.pageSize.getWidth() - 28;
    const cardWidth = (availableWidth - (cardGap * 2)) / 3;
    const cardHeight = 22;

    const drawCard = (x: number, title: string, amount: number, type: 'income' | 'expense' | 'net') => {
      let bgColor: [number, number, number] = [255, 255, 255];
      let borderColor: [number, number, number] = [200, 200, 200];
      let textColor: [number, number, number] = [40, 40, 40];

      if (type === 'income') { // Receivable
        bgColor = [236, 253, 245];
        borderColor = [167, 243, 208];
        textColor = [6, 95, 70];
      } else if (type === 'expense') { // Payable
        bgColor = [254, 242, 242];
        borderColor = [254, 205, 211];
        textColor = [159, 18, 57];
      } else { // Net
        bgColor = [240, 249, 255];
        borderColor = [186, 230, 253];
        textColor = [12, 74, 110];
      }

      doc.setFillColor(...bgColor);
      doc.setDrawColor(...borderColor);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'FD');
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(title.toUpperCase(), x + 6, cardY + 8);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text(`Rs. ${formatCurrency(amount, true)}`, x + 6, cardY + 17);
    };

    drawCard(14, "Total Receivable", totalReceivable, 'income');
    drawCard(14 + cardWidth + cardGap, "Total Payable", totalPayable, 'expense');
    drawCard(14 + (cardWidth * 2) + (cardGap * 2), "Net Outstanding", netOutstanding, 'net');

    // Table
    const tableData = filteredRecords.map(r => [
      new Date(r.due_date).toLocaleDateString(),
      getProjectName(r.project_id),
      getLedgerName(r.ledger_id),
      r.description,
      r.type === 'asset' ? `Rs. ${formatCurrency(r.amount, true)}` : '-',
      r.type === 'liability' ? `Rs. ${formatCurrency(r.amount, true)}` : '-',
      r.status.toUpperCase()
    ]);

    const tableStartY = cardY + cardHeight + 15;
    autoTable(doc, {
      startY: tableStartY,
      head: [['Due Date', 'Project', 'Ledger', 'Description', 'Receivable', 'Payable', 'Status']],
      body: tableData,
      foot: [
        ['', '', '', 'Total', `Rs. ${formatCurrency(totalReceivable, true)}`, `Rs. ${formatCurrency(totalPayable, true)}`, ''],
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [245, 247, 250],
        textColor: [40, 40, 40],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        halign: 'center',
        valign: 'middle'
      },
      footStyles: { fillColor: [240, 240, 240], textColor: 40, fontStyle: 'bold', halign: 'center' },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 4 && data.cell.text[0] !== '-') {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.column.index === 5 && data.cell.text[0] !== '-') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.column.index === 6) { // Status
            data.cell.styles.textColor = data.cell.text[0] === 'PAID' ? [22, 163, 74] : [234, 179, 8];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    doc.save("outstandings_report.pdf");
  };

  const exportToExcel = () => {
    if (filteredRecords.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(filteredRecords.map(r => ({
      'Due Date': new Date(r.due_date).toLocaleDateString(),
      'Project': getProjectName(r.project_id),
      'Ledger': getLedgerName(r.ledger_id),
      'Type': r.type,
      'Description': r.description,
      'Amount': r.amount,
      'Payment Mode': r.payment_mode,
      'Status': r.status,
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Records");
    XLSX.writeFile(workbook, "records.xlsx");
  };


  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Outstandings</h1>
          <p className="text-sm text-muted-foreground">Manage your receivables and payables that are yet to be settled.</p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={cn("rounded-xl border-border/50 shadow-sm", isFiltered && "bg-primary/5 border-primary/20 text-primary font-semibold")}>
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {isFiltered && <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-0 rounded-full h-5 px-1.5 min-w-[20px] justify-center text-[10px]">Active</Badge>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-80 p-4 space-y-4 rounded-2xl shadow-xl border-border/50"
              align="end"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Type</Label>
                    <Select value={localSelectedType} onValueChange={setLocalSelectedType}>
                      <SelectTrigger className="rounded-xl border-border/50">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="asset">Receivable</SelectItem>
                        <SelectItem value="liability">Payable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Status</Label>
                    <Select value={localSelectedStatus} onValueChange={setLocalSelectedStatus}>
                      <SelectTrigger className="rounded-xl border-border/50">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Project</Label>
                  <Combobox
                    options={[
                      { value: ALL_PROJECTS, label: 'All Projects' },
                      ...userVisibleProjects.map(p => ({ value: p.id, label: p.name }))
                    ]}
                    value={localSelectedProject}
                    onChange={setLocalSelectedProject}
                    placeholder="All Projects"
                    searchPlaceholder="Search projects..."
                    notFoundMessage="No projects found."
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Ledger / Cost Code</Label>
                  <Combobox
                    options={[
                      { value: ALL_LEDGERS, label: 'All Ledgers' },
                      ...userVisibleLedgers.map(l => ({ value: l.id, label: l.name }))
                    ]}
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
                    options={[
                      { value: ALL_USERS, label: 'All Users' },
                      ...users.map(u => ({ value: u.id, label: u.name }))
                    ]}
                    value={localSelectedUser}
                    onChange={setLocalSelectedUser}
                    placeholder="All Users"
                    searchPlaceholder="Search users..."
                    notFoundMessage="No users found."
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Due Date Range</Label>
                  <DatePickerWithRange date={localDateRange} setDate={setLocalDateRange} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Payment Mode</Label>
                  <Select value={localPaymentMode} onValueChange={setLocalPaymentMode}>
                    <SelectTrigger className="rounded-xl border-border/50">
                      <SelectValue placeholder="All Modes" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value={ALL_PAYMENT_MODES}>All Modes</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
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
              <Button variant="outline" className="rounded-xl border-border/50 shadow-sm"><Download className="mr-2 h-4 w-4" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              <DropdownMenuItem onClick={exportToPDF} className="rounded-lg"><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel} className="rounded-lg"><File className="mr-2 h-4 w-4" /> Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleAddClick} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-xl border border-border/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 shadow-sm border-l-4 border-l-emerald-500 flex flex-col justify-center">
          <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter mb-0.5">Receivable</p>
          <div className="text-sm font-bold text-emerald-900 dark:text-emerald-300 truncate leading-none">₹{formatCurrency(summary.totalReceivable, true)}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-rose-50/50 dark:bg-rose-950/20 p-3 shadow-sm border-l-4 border-l-rose-500 flex flex-col justify-center">
          <p className="text-[9px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-tighter mb-0.5">Payable</p>
          <div className="text-sm font-bold text-rose-900 dark:text-rose-300 truncate leading-none">₹{formatCurrency(summary.totalPayable, true)}</div>
        </div>
        <div className={cn("rounded-xl border border-border/50 p-3 shadow-sm border-l-4 flex flex-col justify-center", summary.netOutstanding >= 0 ? "bg-blue-50/50 dark:bg-blue-950/20 border-l-blue-500" : "bg-orange-50/50 dark:bg-orange-950/20 border-l-orange-500")}>
          <p className={cn("text-[9px] font-bold uppercase tracking-tighter mb-0.5", summary.netOutstanding >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400")}>Net</p>
          <div className={cn("text-sm font-bold truncate leading-none", summary.netOutstanding >= 0 ? "text-blue-900 dark:text-blue-300" : "text-orange-900 dark:text-orange-300")}>₹{formatCurrency(summary.netOutstanding, true)}</div>
        </div>
      </div>

      {!isLoaded ? (
        <Card className="flex flex-col items-center justify-center rounded-3xl border-border/50 bg-card py-24 text-center">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <h3 className="mt-6 text-base font-bold tracking-tight">Loading Records...</h3>
          <p className="text-muted-foreground text-sm">Syncing with your workspace data.</p>
        </Card>
      ) : filteredRecords.length > 0 ? (
        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
          <CardContent className="p-0">
            <RecordsTable recordables={filteredRecords} onEdit={handleEdit} onView={setViewingRecord} />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-3xl bg-muted/20 border-2 border-dashed border-border/50">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <ReceiptText className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-bold tracking-tight">{isFiltered ? "No records match your filters" : "No outstanding records"}</h3>
          <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
            {isFiltered ? "Try adjusting your filters to find what you're looking for." : "Record your first construction payable or receivable to begin tracking your workspace outstandings."}
          </p>
          {!isFiltered && (
            <Button className="mt-8 rounded-xl bg-primary px-8 h-12 shadow-lg shadow-primary/20" onClick={handleAddClick}>
              <PlusCircle className="mr-2 h-5 w-5" />
              Record First Entry
            </Button>
          )}
        </div>
      )}

      <Dialog open={isSheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="w-full max-w-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit' : 'Add a New'} Record</DialogTitle>
            <DialogDescription>
              {editingRecord
                ? 'Update the details of your payable or receivable.'
                : 'Record a new payable (money out) or receivable (money in).'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <RecordForm setOpen={setSheetOpen} record={editingRecord} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingRecord} onOpenChange={() => setViewingRecord(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewingRecord?.description}</DialogTitle>
            <DialogDescription>
              Outstanding Record Details
            </DialogDescription>
          </DialogHeader>
          {viewingRecord && (
            <div className="py-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="text-muted-foreground">Amount</div>
                <div className={cn('font-bold text-right', viewingRecord.type === 'asset' ? 'text-green-600' : 'text-red-600')}>{formatCurrency(viewingRecord.amount)}</div>

                <div className="text-muted-foreground">Type</div>
                <div className="text-right capitalize">{viewingRecord.type}</div>

                <div className="text-muted-foreground">Status</div>
                <div className="text-right">
                  <Badge variant={viewingRecord.status === 'paid' ? 'outline' : 'secondary'} className="capitalize">
                    {viewingRecord.status}
                  </Badge>
                </div>

                <div className="text-muted-foreground">Due Date</div>
                <div className="text-right">{new Date(viewingRecord.due_date).toLocaleDateString()}</div>

                <div className="text-muted-foreground">Project</div>
                <div className="text-right">{getProjectName(viewingRecord.project_id)}</div>

                <div className="text-muted-foreground">Ledger</div>
                <div className="text-right">{getLedgerName(viewingRecord.ledger_id)}</div>

                <div className="text-muted-foreground">Payment Mode</div>
                <div className="text-right capitalize">{viewingRecord.payment_mode}</div>

                <div className="text-muted-foreground">Entry By</div>
                <div className="text-right">{getUserName(viewingRecord.created_by || '')}</div>
              </div>
              {viewingRecord.bill_url && (
                <Button asChild variant="outline" className="w-full">
                  <a href={viewingRecord.bill_url} target="_blank" rel="noopener noreferrer">
                    <FileText className="mr-2 h-4 w-4" /> View Attached Bill
                  </a>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

