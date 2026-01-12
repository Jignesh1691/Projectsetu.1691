
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Save,
  FileText,
  Download,
  File,
  View,
} from 'lucide-react';
import { useAppState } from '@/hooks/use-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LaborForm } from '@/components/labor-form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import type { Labor, Hajari, AttendanceStatus } from '@/lib/definitions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { format, addDays, subDays, startOfDay, getMonth, getYear, setMonth, setYear } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatCurrency } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addLabor, addLedger, addTransaction, deleteLabor, editLabor, saveHajariRecords, settleHajari } from '@/lib/store';
import { Textarea } from '@/components/ui/textarea';


const ALL_PROJECTS = 'all';

const settlementSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0."),
  payment_mode: z.enum(['cash', 'bank']),
  request_message: z.string().optional(),
});

type SettlementFormValues = z.infer<typeof settlementSchema>;

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const years = Array.from({ length: 10 }, (_, i) => getYear(new Date()) - i);


export default function HajariPage() {
  const { labors, projects, hajari_records, ledgers, currentUser, isLoaded } = useAppState();
  const { toast } = useToast();
  const [isLaborFormOpen, setLaborFormOpen] = useState(false);
  const [editingLabor, setEditingLabor] = useState<Labor | undefined>(undefined);
  const [deletingLaborId, setDeletingLaborId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('');

  const [dailyRecords, setDailyRecords] = useState<Hajari[]>([]);

  const [reportingLabor, setReportingLabor] = useState<Labor | null>(null);
  const [reportMonth, setReportMonth] = useState<number>(getMonth(new Date()));
  const [reportYear, setReportYear] = useState<number>(getYear(new Date()));

  const settlementForm = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema) as any,
  });

  useEffect(() => {
    setSelectedDate(startOfDay(new Date()));
  }, []);

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  const dateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  const initializeDailyRecords = useCallback(() => {
    if (!selectedProject || labors.length === 0 || !dateString) {
      setDailyRecords([]);
      return;
    }

    const newDailyRecords = labors.map(labor => {
      const existingRecord = hajari_records.find(
        h => h.labor_id === labor.id && h.project_id === selectedProject && h.date === dateString
      );
      if (existingRecord) {
        return existingRecord;
      }
      return {
        id: `hajari-${labor.id}-${dateString}-${selectedProject}`,
        labor_id: labor.id,
        project_id: selectedProject,
        date: dateString,
        status: 'absent' as AttendanceStatus,
        overtime_hours: 0,
        upad: 0,
      };
    });
    setDailyRecords(newDailyRecords);
  }, [labors, selectedProject, dateString, hajari_records]);


  useEffect(() => {
    initializeDailyRecords();
  }, [selectedDate, selectedProject, labors, hajari_records, initializeDailyRecords]);

  const handleAddLaborClick = () => {
    setEditingLabor(undefined);
    setLaborFormOpen(true);
  };

  const handleEditLaborClick = (labor: Labor) => {
    setEditingLabor(labor);
    setLaborFormOpen(true);
  };

  const handleViewReportClick = (labor: Labor) => {
    setReportingLabor(labor);
    setReportMonth(getMonth(new Date()));
    setReportYear(getYear(new Date()));
  };


  const handleDeleteConfirm = async () => {
    if (deletingLaborId) {
      await deleteLabor(deletingLaborId);
      toast({
        title: 'Success!',
        description: 'Labor has been deleted.',
      });
      setDeletingLaborId(null);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(startOfDay(date));
    }
  };

  const handleUpdateRecord = (laborId: string, field: keyof Hajari, value: any) => {
    setDailyRecords(prev =>
      prev.map(rec => (rec.labor_id === laborId ? { ...rec, [field]: value } : rec))
    );
  };

  const handleSaveHajari = async () => {
    if (!selectedDate || !currentUser) return;
    await saveHajariRecords(dailyRecords, currentUser);
    toast({
      title: currentUser.role === 'admin' ? 'Hajari Saved!' : 'Hajari Request Submitted',
      description: currentUser.role === 'admin'
        ? `Attendance for ${format(selectedDate, 'PPP')} has been saved.`
        : `Your attendance log for ${format(selectedDate, 'PPP')} has been submitted for approval.`,
    });
  };

  const { totalWage, totalUpad, finalAmount } = useMemo(() => {
    let wage = 0;
    let upad = 0;

    dailyRecords.forEach(record => {
      const labor = labors.find(l => l.id === record.labor_id);
      if (!labor) return;

      let dayWage = 0;
      if (record.status === 'present') {
        dayWage = labor.rate;
      } else if (record.status === 'half-day') {
        dayWage = labor.rate / 2;
      }

      const overtimePay = record.overtime_hours > 0 ? (labor.rate / 8) * record.overtime_hours * 1.5 : 0;

      wage += dayWage + overtimePay;
      upad += Number(record.upad) || 0;
    });

    return { totalWage: wage, totalUpad: upad, finalAmount: wage - upad };
  }, [dailyRecords, labors]);

  const monthlyReportData = useMemo(() => {
    if (!reportingLabor) return { records: [], summary: {} as any, hasPendingSettlement: false };

    const records = hajari_records.filter(h =>
      h.labor_id === reportingLabor.id &&
      getYear(new Date(h.date)) === reportYear &&
      getMonth(new Date(h.date)) === reportMonth
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let totalWage = 0;
    let totalUpad = 0;
    let totalOvertime = 0;
    let totalSettled = 0;

    const hasPendingSettlement = records.some(rec => rec.status === 'pending-settlement');

    records.forEach(rec => {
      if (rec.status === 'settlement') {
        totalSettled += rec.upad; // upad field used for settlement amount
        return;
      }
      if (rec.status === 'pending-settlement') return;

      let dayWage = 0;
      if (rec.status === 'present') {
        present++;
        dayWage = reportingLabor.rate;
      } else if (rec.status === 'absent') {
        absent++;
      } else if (rec.status === 'half-day') {
        halfDay++;
        dayWage = reportingLabor.rate / 2;
      }

      const overtimePay = rec.overtime_hours > 0 ? (reportingLabor.rate / 8) * rec.overtime_hours * 1.5 : 0;

      totalOvertime += rec.overtime_hours;
      totalUpad += Number(rec.upad) || 0;
      totalWage += dayWage + overtimePay;
    });

    const finalAmount = totalWage - totalUpad;
    const payableAmount = finalAmount - totalSettled;

    return {
      records,
      hasPendingSettlement,
      summary: {
        present,
        absent,
        halfDay,
        totalWage,
        totalUpad,
        totalOvertime,
        totalSettled,
        finalAmount,
        payableAmount,
      }
    };
  }, [reportingLabor, hajari_records, reportMonth, reportYear]);

  useEffect(() => {
    if (reportingLabor) {
      settlementForm.reset({
        amount: monthlyReportData.summary.payableAmount > 0 ? monthlyReportData.summary.payableAmount : 0,
        payment_mode: 'bank',
        request_message: '',
      });
    }
  }, [monthlyReportData, reportingLabor, settlementForm]);


  const handleSettlementSubmit = async (values: SettlementFormValues) => {
    if (!reportingLabor || !currentUser) return;

    await settleHajari({
      labor: reportingLabor,
      year: reportYear,
      month: reportMonth,
      amount: values.amount,
      payment_mode: values.payment_mode,
      settlementDate: new Date(),
      projectId: selectedProject !== ALL_PROJECTS ? selectedProject : undefined,
    }, currentUser, values.request_message);


    toast({
      title: currentUser.role === 'admin' ? "Settlement Recorded" : "Settlement Request Submitted",
      description: currentUser.role === 'admin'
        ? `Payment of ${formatCurrency(values.amount)} for ${reportingLabor.name} has been recorded.`
        : `Request to settle payment for ${reportingLabor.name} has been sent for approval.`
    });

    settlementForm.reset();
  };

  const exportReportToPdf = () => {
    if (!reportingLabor) return;
    const doc = new jsPDF();
    const selectedMonthName = months[reportMonth];

    // Title
    doc.setFontSize(18);
    doc.text(`Monthly Report for ${reportingLabor.name}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`${selectedMonthName} ${reportYear}`, 14, 30);

    // Summary
    const summaryData = monthlyReportData.summary;
    const summaryBody = [
      ['Present Days', summaryData.present],
      ['Half Days', summaryData.halfDay],
      ['Absent Days', summaryData.absent],
      ['Total Overtime', `${summaryData.totalOvertime} hrs`],
      ['Total Wage', formatCurrency(summaryData.totalWage || 0, true)],
      ['Total Upad', formatCurrency(summaryData.totalUpad || 0, true)],
      ['Total Settled', formatCurrency(summaryData.totalSettled || 0, true)],
      ['Payable Amount', formatCurrency(summaryData.payableAmount || 0, true)],
    ];

    autoTable(doc, {
      startY: 40,
      head: [['Summary', 'Value']],
      body: summaryBody,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      didParseCell: (data) => {
        if (data.column.index === 1) {
          data.cell.styles.halign = 'right';
        }
        if (data.section === 'body' && data.row.index >= 4) { // Currency rows
          const rawValue = summaryBody[data.row.index][1] as string;
          data.cell.text = ['Rs. ' + rawValue];
        }
      }
    });

    const lastY = (doc as any).lastAutoTable.finalY;

    // Detailed Records
    if (monthlyReportData.records.length > 0) {
      doc.setFontSize(14);
      doc.text('Detailed Records', 14, lastY + 15);

      const tableCols = ['Date', 'Project', 'Status', 'OT (hrs)', 'Upad (Rs)', 'Wage (Rs)'];
      const tableRows = monthlyReportData.records.map(rec => {
        const project = projects.find(p => p.id === rec.project_id);
        let dayWage = 0;
        if (rec.status === 'present') dayWage = reportingLabor?.rate || 0;
        if (rec.status === 'half-day') dayWage = (reportingLabor?.rate || 0) / 2;
        const overtimePay = rec.overtime_hours > 0 ? ((reportingLabor?.rate || 0) / 8) * rec.overtime_hours * 1.5 : 0;
        const totalDayWage = dayWage + overtimePay;

        return [
          format(new Date(rec.date), 'dd/MM/yyyy'),
          project?.name || 'N/A',
          rec.status.replace('-', ' '),
          rec.overtime_hours,
          formatCurrency(rec.upad, true),
          formatCurrency(totalDayWage, true)
        ];
      });

      autoTable(doc, {
        startY: lastY + 20,
        head: [tableCols],
        body: tableRows,
        theme: 'striped',
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
        }
      });
    }


    doc.save(`hajari_report_${reportingLabor.name.replace(' ', '_')}_${selectedMonthName}_${reportYear}.pdf`);
  };

  if (!selectedDate) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Hajari Calculation</h1>
          <p className="text-sm text-muted-foreground">Manage workforce attendance, overtime, and monthly settlements.</p>
        </div>
      </div>

      <Tabs defaultValue="hajari" className="w-full">
        <TabsList className="bg-muted p-1 rounded-xl flex items-center gap-1 border border-border/50 w-fit mb-4">
          <TabsTrigger value="hajari" className="rounded-lg px-4 h-8 text-xs transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">Attendance Sheet</TabsTrigger>
          <TabsTrigger value="labors" className="rounded-lg px-4 h-8 text-xs transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">Manage Workforce</TabsTrigger>
        </TabsList>
        <TabsContent value="hajari" className="space-y-4 mt-4">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="p-3 pb-2 bg-muted/5 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Attendance Filter</CardTitle>
            </CardHeader>
            <CardContent className="p-2.5 flex flex-col sm:flex-row gap-2 items-center">
              <div className="flex items-center gap-2 border rounded-xl p-1 bg-muted/30 w-full sm:w-auto">
                <Button variant="ghost" size="icon" className="rounded-lg h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleDateChange(subDays(selectedDate, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"ghost"}
                      className={cn(
                        "w-full sm:w-[200px] justify-start text-left font-semibold h-8 text-sm",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border/50" align="center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" className="rounded-lg h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => handleDateChange(addDays(selectedDate, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Combobox
                options={projects.map(p => ({ value: p.id, label: p.name }))}
                value={selectedProject}
                onChange={setSelectedProject}
                placeholder="Select a project"
                searchPlaceholder="Search..."
                notFoundMessage="Not found."
                triggerClassName="w-full sm:w-[250px] rounded-xl border-border/50 shadow-sm h-8 text-xs"
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-2 px-0.5">
            <div className="rounded-xl border border-border/50 bg-emerald-50/30 p-2.5 shadow-sm border-l-4 border-l-emerald-500 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-tighter mb-0.5">Total Wage</p>
              <div className="text-sm font-bold text-emerald-900 truncate leading-none">₹{formatCurrency(totalWage, true)}</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-rose-50/30 p-2.5 shadow-sm border-l-4 border-l-rose-500 flex flex-col justify-center">
              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-tighter mb-0.5">Total Upad</p>
              <div className="text-sm font-bold text-rose-900 truncate leading-none">₹{formatCurrency(totalUpad, true)}</div>
            </div>
            <div className={cn("rounded-xl border border-border/50 p-2.5 shadow-sm border-l-4 flex flex-col justify-center", finalAmount >= 0 ? "bg-blue-50/30 border-l-blue-500" : "bg-orange-50/30 border-l-orange-500")}>
              <p className={cn("text-[10px] font-bold uppercase tracking-tighter mb-0.5", finalAmount >= 0 ? "text-blue-700" : "text-orange-700")}>Final</p>
              <div className={cn("text-sm font-bold truncate leading-none", finalAmount >= 0 ? "text-blue-900" : "text-orange-900")}>₹{formatCurrency(finalAmount, true)}</div>
            </div>
          </div>

          {selectedProject ? (
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm font-bold">Attendance for {format(selectedDate, 'PPP')}</CardTitle>
                <CardDescription className="text-[11px]">Project: {projects.find(p => p.id === selectedProject)?.name}</CardDescription>
              </CardHeader>
              <CardContent className='p-0'>
                {/* Mobile View */}
                <div className="md:hidden">
                  {labors.length > 0 ? dailyRecords.map(record => {
                    const labor = labors.find(l => l.id === record.labor_id);
                    if (!labor) return null;
                    return (
                      <div key={record.id} className="p-3 border-b border-border/50 hover:bg-muted/5 transition-colors last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-sm leading-none text-foreground">{labor.name}</p>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 px-1.5 py-0.5 rounded mt-1.5 inline-block">
                              {labor.type}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-[1.5]">
                            <Select
                              value={record.status}
                              onValueChange={(value) => handleUpdateRecord(labor.id, 'status', value)}
                            >
                              <SelectTrigger className="h-8 text-[11px] rounded-lg bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present" className="text-xs">Present</SelectItem>
                                <SelectItem value="absent" className="text-xs">Absent</SelectItem>
                                <SelectItem value="half-day" className="text-xs">Half-day</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground uppercase pointer-events-none">OT</span>
                              <Input
                                type="number"
                                className="h-8 text-[11px] rounded-lg pl-7 text-right bg-background"
                                value={record.overtime_hours}
                                onChange={(e) => handleUpdateRecord(labor.id, 'overtime_hours', parseFloat(e.target.value) || 0)}
                                disabled={record.status === 'absent'}
                              />
                            </div>
                          </div>
                          <div className="flex-[1.2] min-w-0">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground uppercase pointer-events-none">₹</span>
                              <Input
                                type="number"
                                className="h-8 text-[11px] rounded-lg pl-5 text-right bg-background"
                                value={record.upad}
                                onChange={(e) => handleUpdateRecord(labor.id, 'upad', parseFloat(e.target.value) || 0)}
                                disabled={record.status === 'absent'}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <p className="text-sm font-medium">No labors found.</p>
                    </div>
                  )}
                </div>
                {/* Desktop View */}
                <div className='hidden md:block'>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Labor Name</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Attendance</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Overtime (hrs)</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-right pr-6">Upad/Advance (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {labors.length > 0 ? dailyRecords.map(record => {
                        const labor = labors.find(l => l.id === record.labor_id);
                        if (!labor) return null;

                        return (
                          <TableRow key={record.id} className="hover:bg-muted/5 transition-colors">
                            <TableCell className="font-bold text-sm">{labor.name}</TableCell>
                            <TableCell>
                              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">{labor.type}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Select
                                value={record.status}
                                onValueChange={(value) => handleUpdateRecord(labor.id, 'status', value)}
                              >
                                <SelectTrigger className="h-8 text-xs w-[110px] mx-auto rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="present" className="text-xs">Present</SelectItem>
                                  <SelectItem value="absent" className="text-xs">Absent</SelectItem>
                                  <SelectItem value="half-day" className="text-xs">Half-day</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                className="h-8 text-xs w-16 mx-auto rounded-lg text-center"
                                value={record.overtime_hours}
                                onChange={(e) => handleUpdateRecord(labor.id, 'overtime_hours', parseFloat(e.target.value) || 0)}
                                disabled={record.status === 'absent'}
                              />
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Input
                                type="number"
                                className="h-8 text-xs w-24 ml-auto rounded-lg text-right"
                                value={record.upad}
                                onChange={(e) => handleUpdateRecord(labor.id, 'upad', parseFloat(e.target.value) || 0)}
                                disabled={record.status === 'absent'}
                              />
                            </TableCell>
                          </TableRow>
                        )
                      }) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground font-medium">
                            No labors found. Add labors in the 'Manage Labors' tab.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="p-3 bg-muted/5 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="grid grid-cols-3 gap-1 flex-1">
                  <div className="space-y-0.5 text-center sm:text-left">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Wage</p>
                    <p className="text-sm font-bold text-emerald-600 leading-none">{formatCurrency(totalWage)}</p>
                  </div>
                  <div className="space-y-0.5 text-center sm:text-left">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Upad</p>
                    <p className="text-sm font-bold text-rose-600 leading-none">{formatCurrency(totalUpad)}</p>
                  </div>
                  <div className="space-y-0.5 text-center sm:text-left">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Final</p>
                    <p className="text-sm font-bold text-blue-600 leading-none">{formatCurrency(finalAmount)}</p>
                  </div>
                </div>
                <Button onClick={handleSaveHajari} disabled={labors.length === 0} size="sm" className="h-10 px-6 rounded-xl shadow-lg shadow-primary/20 bg-primary font-bold text-sm">
                  <Save className="mr-2 h-4 w-4" />
                  Save Hajari
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="flex flex-col items-center justify-center py-20 border-dashed">
              <Users className="h-16 w-16 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Select a Project</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Please select a project to start recording attendance.
              </p>
            </Card>
          )}

        </TabsContent>
        <TabsContent value="labors" className="space-y-4 mt-4">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="flex-row items-center justify-between p-4 pb-2">
              <div>
                <CardTitle className="text-base font-bold">Manage Labors</CardTitle>
                <CardDescription className="text-xs">Add, edit, or remove your workforce.</CardDescription>
              </div>
              <Button onClick={handleAddLaborClick} size="sm" className="h-8 text-xs px-3">
                <PlusCircle className="mr-0 md:mr-2 h-3.5 w-3.5" />
                <span className="hidden md:inline">Add Labor</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoaded && labors.length > 0 ? (
                <ul className="divide-y divide-border/50">
                  {labors.map((labor) => (
                    <li key={labor.id} className="p-3 md:p-4 flex justify-between items-center hover:bg-muted/5 transition-colors">
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm text-foreground">{labor.name}</p>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{labor.type}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-lg px-2" onClick={() => handleViewReportClick(labor)}>
                          <FileText className="mr-1.5 h-3 w-3" /> Report
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-muted">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem className="text-xs" onClick={() => handleEditLaborClick(labor)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs text-destructive focus:text-destructive"
                              onClick={() => setDeletingLaborId(labor.id)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No labors added yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      <Dialog open={isLaborFormOpen} onOpenChange={setLaborFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingLabor ? 'Edit' : 'Add New'} Labor/Foreman</DialogTitle>
            <DialogDescription>
              {editingLabor ? 'Update the details of your worker.' : 'Add a new worker to your list.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <LaborForm setOpen={setLaborFormOpen} labor={editingLabor} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reportingLabor} onOpenChange={(open) => { if (!open) setReportingLabor(null) }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary/5 p-4 border-b">
            <DialogHeader className="flex-row items-center justify-between space-y-0">
              <div className="space-y-0.5">
                <DialogTitle className="text-lg font-bold">Monthly Report: {reportingLabor?.name}</DialogTitle>
                <DialogDescription className="text-xs">
                  Review attendance, overtime, and monthly settlements.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={exportReportToPdf} disabled={monthlyReportData.records.length === 0} size="sm" className="h-8 text-xs bg-background">
                  <Download className="mr-2 h-3.5 w-3.5" /> Export PDF
                </Button>
              </div>
            </DialogHeader>
          </div>
          <div className="p-4 bg-muted/20 border-b flex items-center gap-3">
            <Select value={String(reportMonth)} onValueChange={(val) => setReportMonth(Number(val))}>
              <SelectTrigger className="h-8 text-xs w-[130px] bg-background">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={index} value={String(index)} className="text-xs">{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(reportYear)} onValueChange={(val) => setReportYear(Number(val))}>
              <SelectTrigger className="h-8 text-xs w-[100px] bg-background">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={String(year)} className="text-xs">{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-col lg:flex-row gap-0'>
            <div className="w-full lg:w-80 border-r bg-muted/5 flex flex-col">
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Financial Summary</h4>
                  <div className="space-y-2">
                    <div className='flex justify-between items-center text-xs'>
                      <span className='text-muted-foreground'>Total Wage</span>
                      <span className='font-bold text-emerald-600'>{formatCurrency(monthlyReportData.summary.totalWage || 0)}</span>
                    </div>
                    <div className='flex justify-between items-center text-xs'>
                      <span className='text-muted-foreground'>Total Upad</span>
                      <span className='font-bold text-rose-600'>{formatCurrency(monthlyReportData.summary.totalUpad || 0)}</span>
                    </div>
                    <div className='flex justify-between items-center text-xs pb-2 border-b'>
                      <span className='text-muted-foreground'>Total Settled</span>
                      <span className='font-bold text-blue-600'>{formatCurrency(monthlyReportData.summary.totalSettled || 0)}</span>
                    </div>
                    <div className='flex justify-between items-center pt-2'>
                      <span className='text-xs font-bold'>Payable</span>
                      <span className='text-base font-black text-emerald-700'>{formatCurrency(monthlyReportData.summary.payableAmount || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Settle Month</h4>
                  {monthlyReportData.summary.payableAmount > 0 ? (
                    <form onSubmit={settlementForm.handleSubmit(handleSettlementSubmit)} className="space-y-3">
                      <Controller
                        control={settlementForm.control}
                        name="amount"
                        render={({ field }) => (
                          <div className="space-y-1">
                            <Label htmlFor="settlement-amount" className="text-[10px] font-bold uppercase text-muted-foreground">Amount</Label>
                            <Input id="settlement-amount" type="number" {...field} className="h-8 text-xs" />
                            {settlementForm.formState.errors.amount && <p className="text-[10px] text-red-500">{settlementForm.formState.errors.amount.message}</p>}
                          </div>
                        )}
                      />
                      <Controller
                        control={settlementForm.control}
                        name="payment_mode"
                        render={({ field }) => (
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Payment Mode</Label>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bank" className="text-xs">Bank</SelectItem>
                                <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                              </SelectContent>
                            </Select>
                            {settlementForm.formState.errors.payment_mode && <p className="text-[10px] text-red-500">{settlementForm.formState.errors.payment_mode.message}</p>}
                          </div>
                        )}
                      />
                      {currentUser?.role !== 'admin' && (
                        <Controller
                          control={settlementForm.control}
                          name="request_message"
                          render={({ field }) => (
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Message</Label>
                              <Textarea placeholder="Optional message..." {...field} className="text-xs min-h-[60px]" />
                            </div>
                          )}
                        />
                      )}
                      <Button type="submit" size="sm" className="w-full text-xs h-9 rounded-xl shadow-lg shadow-primary/10" disabled={monthlyReportData.hasPendingSettlement}>
                        {monthlyReportData.hasPendingSettlement ? 'Pending Approval' : 'Settle Payment'}
                      </Button>
                    </form>
                  ) : (
                    <div className="bg-muted/30 p-4 rounded-xl text-center border border-dashed">
                      <p className="text-[11px] text-muted-foreground font-medium">No payable amount.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 max-h-[70vh] overflow-y-auto">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider">Project</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-center">Status</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-center">OT</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right">Upad</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-right pr-6">Wage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyReportData.records.length > 0 ? monthlyReportData.records.map(rec => {
                      const project = projects.find(p => p.id === rec.project_id);
                      let dayWage = 0;

                      if (rec.status === 'settlement' || rec.status === 'pending-settlement') return null; // Don't show settlement rows here

                      if (rec.status === 'present') dayWage = reportingLabor?.rate || 0;
                      if (rec.status === 'half-day') dayWage = (reportingLabor?.rate || 0) / 2;
                      const overtimePay = rec.overtime_hours > 0 ? ((reportingLabor?.rate || 0) / 8) * rec.overtime_hours * 1.5 : 0;
                      const totalDayWage = dayWage + overtimePay;

                      return (
                        <TableRow key={rec.id} className="hover:bg-muted/5 transition-colors">
                          <TableCell className="text-xs font-medium whitespace-nowrap">{format(new Date(rec.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">{project?.name}</TableCell>
                          <TableCell className="text-center">
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter whitespace-nowrap",
                              rec.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                                rec.status === 'half-day' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                            )}>
                              {rec.status.replace('-', ' ')}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs">{rec.overtime_hours > 0 ? rec.overtime_hours : '-'}</TableCell>
                          <TableCell className="text-right text-xs font-medium text-rose-600">{rec.upad > 0 ? formatCurrency(rec.upad) : '-'}</TableCell>
                          <TableCell className="text-right text-xs font-bold pr-6">{formatCurrency(totalDayWage)}</TableCell>
                        </TableRow>
                      )
                    }) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No records found for this month.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>


      <AlertDialog open={!!deletingLaborId} onOpenChange={() => setDeletingLaborId(null)}>
        <AlertDialogContent>
          <DialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this worker and all their associated attendance records. This action cannot be undone.
            </AlertDialogDescription>
          </DialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}


