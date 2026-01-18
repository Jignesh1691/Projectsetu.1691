
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, FolderKanban, MoreVertical, Pencil, Trash2, Download, FileText, File, View } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppState } from '@/hooks/use-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProjectForm } from '@/components/project-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn } from '@/lib/utils';
import { getEffectiveTransaction, getEffectiveRecordable } from '@/lib/financial-utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Project, Transaction, Recordable, Task, MaterialLedgerEntry, Document, Photo } from '@/lib/definitions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteProject } from '@/lib/store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Separator } from '@/components/ui/separator';


export default function ProjectsPage() {
  const {
    projects,
    transactions,
    recordables,
    tasks,
    material_ledger,
    materials,
    documents,
    photos,
    ledgers,
    appUser,
    userVisibleProjects,
    isLoaded
  } = useAppState();
  const { toast } = useToast();
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [deletingProject, setDeletingProject] = useState<Project | undefined>(undefined);
  const [viewingProject, setViewingProject] = useState<Project | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const getLedgerName = (id: string) => ledgers.find((l) => l.id === id)?.name || 'N/A';
  const getMaterialName = (id: string) => materials.find((m) => m.id === id)?.name || 'N/A';
  const getMaterialUnit = (id: string) => materials.find((m) => m.id === id)?.unit || '';

  const handleAddClick = () => {
    setEditingProject(undefined);
    setFormOpen(true);
  };

  const handleEditClick = (project: Project) => {
    setEditingProject(project);
    setFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (deletingProject && deleteConfirmation === deletingProject.name) {
      await deleteProject(deletingProject.id);
      toast({
        title: 'Success!',
        description: `Project "${deletingProject.name}" has been deleted.`,
      });
      setDeletingProject(undefined);
      setDeleteConfirmation('');
    }
  };

  const calculateProjectFinancials = (projectId: string) => {
    const projectTransactions = transactions
      .filter((t) => t.project_id === projectId)
      .map(t => getEffectiveTransaction(t))
      .filter((t): t is Transaction => t !== null);

    const income = projectTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expenses = projectTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const net = income - expenses;
    return { income, expenses, net, transactionCount: projectTransactions.length };
  };

  const filteredProjects = useMemo(() => {
    if (!isLoaded) return [];
    return userVisibleProjects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [userVisibleProjects, searchTerm, isLoaded]);

  const summary = useMemo(() => {
    if (!isLoaded) return { totalIncome: 0, totalExpense: 0, netBalance: 0, totalReceivable: 0, totalPayable: 0, netOutstanding: 0 };

    const effectiveTx = transactions
      .map(t => getEffectiveTransaction(t))
      .filter((t): t is Transaction => t !== null);

    const effectiveRecords = recordables
      .map(r => getEffectiveRecordable(r))
      .filter((r): r is Recordable => r !== null);

    const totalIncome = effectiveTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = effectiveTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    const totalReceivable = effectiveRecords.filter(r => r.type === 'asset' && r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
    const totalPayable = effectiveRecords.filter(r => r.type === 'liability' && r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      totalReceivable,
      totalPayable,
      netOutstanding: totalReceivable - totalPayable
    };
  }, [transactions, recordables, isLoaded]);

  const exportToPDF = () => {
    if (filteredProjects.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Calculate Aggregate Totals
    const aggs = filteredProjects.reduce((acc, p) => {
      const { income, expenses } = calculateProjectFinancials(p.id);
      acc.income += income;
      acc.expenses += expenses;
      return acc;
    }, { income: 0, expenses: 0 });
    const netAgg = aggs.income - aggs.expenses;

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text('Projects Report', 14, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    // Financial Overview Section with Cards
    const overviewY = 30;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text("Global Projects Overview", 14, overviewY);

    const cardY = overviewY + 5;
    const cardGap = 6;
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

    drawCard(14, "Total Income", aggs.income, 'income');
    drawCard(14 + cardWidth + cardGap, "Total Expense", aggs.expenses, 'expense');
    drawCard(14 + (cardWidth * 2) + (cardGap * 2), "Net Balance", netAgg, 'net');

    // Table
    const tableStartY = cardY + cardHeight + 15;
    autoTable(doc, {
      startY: tableStartY,
      head: [['Project Name', 'Location', 'Txns', 'Income', 'Expenses', 'Net']],
      body: filteredProjects.map(p => {
        const { income, expenses, net, transactionCount } = calculateProjectFinancials(p.id);
        return [p.name, p.location || '-', transactionCount, `Rs. ${formatCurrency(income, true)}`, `Rs. ${formatCurrency(expenses, true)}`, `Rs. ${formatCurrency(net, true)}`];
      }),
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
        if (data.section === 'body' && data.column.index === 5) {
          const rawVal = data.cell.raw != null ? String(data.cell.raw) : '';
          const val = parseFloat(rawVal.replace(/[^0-9.-]+/g, ""));
          data.cell.styles.textColor = val >= 0 ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    doc.save('projects_report.pdf');
  };

  const exportToExcel = () => {
    if (filteredProjects.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      filteredProjects.map(p => {
        const { income, expenses, net, transactionCount } = calculateProjectFinancials(p.id);
        return {
          'Project Name': p.name,
          'Location': p.location || 'N/A',
          'Transactions': transactionCount,
          'Income (INR)': income,
          'Expenses (INR)': expenses,
          'Net (INR)': net,
        };
      })
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Projects');
    XLSX.writeFile(workbook, 'projects_report.xlsx');
  };

  const exportProjectReport = (project: Project, format: 'pdf' | 'excel') => {
    const projectTransactions = transactions.filter(t => t.project_id === project.id);
    const projectOutstandings = recordables.filter(r => r.project_id === project.id);
    const projectTasks = tasks.filter(t => t.project_id === project.id);
    const projectInventory = material_ledger.filter(ml => ml.project_id === project.id);
    const projectDocuments = documents.filter(d => d.project_id === project.id);
    const projectPhotos = photos.filter(p => p.project_id === project.id);

    if (format === 'pdf') {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(`Project Report: ${project.name}`, 14, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(`Location: ${project.location || 'N/A'} | Generated: ${new Date().toLocaleDateString()}`, 14, 26);

      // Calculate financials explicitly from the transactions list to ensure consistency with the table
      const effectiveTransactions = projectTransactions
        .map(t => getEffectiveTransaction(t))
        .filter((t): t is Transaction => t !== null);

      let pIncome = 0;
      let pExpenses = 0;
      effectiveTransactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') pIncome += amt;
        if (t.type === 'expense') pExpenses += amt;
      });
      const pNet = pIncome - pExpenses;

      // Calculate outstandings
      const effectiveRecords = projectOutstandings
        .map(r => getEffectiveRecordable(r))
        .filter((r): r is Recordable => r !== null);

      const pReceivable = effectiveRecords.filter(r => r.type === 'asset' && r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
      const pPayable = effectiveRecords.filter(r => r.type === 'liability' && r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);

      const overviewY = 35;

      // Financial Overview Section Title
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40);
      doc.text("Project Financial Overview", 14, overviewY);

      // Section Cards Layout
      const cardY = overviewY + 5;
      const cardGap = 4;
      const availableWidth = doc.internal.pageSize.getWidth() - 28;
      const smallCardWidth = (availableWidth - (cardGap * 4)) / 5;
      const cardHeight = 22;

      // Helper to draw card
      const drawCard = (x: number, y: number, w: number, title: string, amount: number, type: 'income' | 'expense' | 'net' | 'rec' | 'pay') => {
        let bgColor: [number, number, number] = [255, 255, 255];
        let borderColor: [number, number, number] = [200, 200, 200];
        let textColor: [number, number, number] = [40, 40, 40];

        if (type === 'income' || type === 'rec') {
          bgColor = [236, 253, 245];
          borderColor = [167, 243, 208];
          textColor = [6, 95, 70];
        } else if (type === 'expense' || type === 'pay') {
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
        doc.roundedRect(x, y, w, cardHeight, 3, 3, 'FD');

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100);
        doc.text(title.toUpperCase(), x + 4, y + 8);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textColor);
        doc.text(`Rs. ${formatCurrency(amount, true)}`, x + 4, y + 17);
      };

      // Draw Financial Cards
      drawCard(14, cardY, smallCardWidth, "Income", pIncome, 'income');
      drawCard(14 + smallCardWidth + cardGap, cardY, smallCardWidth, "Expenses", pExpenses, 'expense');
      drawCard(14 + (smallCardWidth + cardGap) * 2, cardY, smallCardWidth, "Net Balance", pNet, 'net');

      // Draw Outstanding Cards
      drawCard(14 + (smallCardWidth + cardGap) * 3, cardY, smallCardWidth, "Receivable", pReceivable, 'rec');
      drawCard(14 + (smallCardWidth + cardGap) * 4, cardY, smallCardWidth, "Payable", pPayable, 'pay');

      let lastY = cardY + cardHeight + 12;

      const addSection = (title: string, head: string[][], body: any[][], colorCallback?: (data: any) => void) => {
        if (body.length > 0) {
          doc.setTextColor(40);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(title, 14, lastY + 6);
          autoTable(doc, {
            head,
            body,
            startY: lastY + 10,
            theme: 'grid',
            headStyles: {
              fillColor: [245, 247, 250],
              textColor: [40, 40, 40],
              fontStyle: 'bold',
              lineWidth: 0.1,
              lineColor: [220, 220, 220],
              halign: 'center',
              valign: 'middle'
            },
            styles: {
              fontSize: 9,
              cellPadding: 3,
              lineWidth: 0.1,
              lineColor: [230, 230, 230],
              halign: 'center',
              valign: 'middle'
            },
            didParseCell: colorCallback
          });
          lastY = (doc as any).lastAutoTable.finalY + 10;
        }
      };

      addSection('Transactions',
        [['Date', 'Description', 'Ledger', 'Type', 'Amount']],
        projectTransactions.map((t: Transaction) => [new Date(t.date).toLocaleDateString(), t.description, getLedgerName(t.ledger_id), t.type.toUpperCase(), `Rs. ${formatCurrency(t.amount, true)}`]),
        (data) => {
          if (data.section === 'body') {
            if (data.column.index === 3) { // Type
              const type = data.cell.text[0].toLowerCase();
              data.cell.styles.textColor = type === 'income' ? [22, 163, 74] : [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.column.index === 4) { // Amount
              const type = data.row.raw[3].toLowerCase();
              data.cell.styles.textColor = type === 'income' ? [22, 163, 74] : [220, 38, 38];
              data.cell.styles.halign = 'center';
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      );

      addSection('Outstandings',
        [['Due Date', 'Description', 'Ledger', 'Type', 'Amount', 'Status']],
        projectOutstandings.map((r: Recordable) => [new Date(r.due_date).toLocaleDateString(), r.description, getLedgerName(r.ledger_id), r.type.toUpperCase(), `Rs. ${formatCurrency(r.amount, true)}`, r.status.toUpperCase()]),
        (data) => {
          if (data.section === 'body') {
            if (data.column.index === 3) { // Type
              const type = data.cell.text[0].toLowerCase();
              data.cell.styles.textColor = type === 'asset' ? [22, 163, 74] : [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.column.index === 4) { // Amount
              const type = data.row.raw[3].toLowerCase();
              data.cell.styles.textColor = type === 'asset' ? [22, 163, 74] : [220, 38, 38];
              data.cell.styles.halign = 'center';
              data.cell.styles.fontStyle = 'bold';
            }
            if (data.column.index === 5) { // Status
              data.cell.styles.textColor = data.cell.text[0].toLowerCase() === 'paid' ? [22, 163, 74] : [234, 179, 8];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      );

      addSection('Tasks', [['Title', 'Description', 'Status', 'Due Date']], projectTasks.map((t: Task) => [t.title, t.description, t.status, t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A']));
      addSection('Inventory', [['Date', 'Material', 'Type', 'Quantity']], projectInventory.map((i: MaterialLedgerEntry) => [new Date(i.date).toLocaleDateString(), getMaterialName(i.material_id), i.type, `${i.quantity} ${getMaterialUnit(i.material_id)}`]));

      // Simple lists
      addSection('Documents', [['Date Added', 'Name', 'Description']], projectDocuments.map((d: Document) => [new Date(d.created_at).toLocaleDateString(), d.document_name, d.description]));
      addSection('Photos', [['Date Added', 'Description']], projectPhotos.map((p: Photo) => [new Date(p.created_at).toLocaleDateString(), p.description]));

      doc.save(`Project_Report_${project.name}.pdf`);

    } else { // Excel export
      const wb = XLSX.utils.book_new();

      const addSheet = (sheetName: string, data: any[]) => {
        if (data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      }

      addSheet('Transactions', projectTransactions.map(t => ({ Date: new Date(t.date).toLocaleDateString(), Description: t.description, Ledger: getLedgerName(t.ledger_id), Type: t.type, Amount: t.amount })));
      addSheet('Outstandings', projectOutstandings.map(r => ({ 'Due Date': new Date(r.due_date).toLocaleDateString(), Description: r.description, Ledger: getLedgerName(r.ledger_id), Type: r.type, Amount: r.amount, Status: r.status })));
      addSheet('Tasks', projectTasks.map(t => ({ Title: t.title, Description: t.description, Status: t.status, 'Due Date': t.due_date ? new Date(t.due_date).toLocaleDateString() : 'N/A' })));
      addSheet('Inventory', projectInventory.map(i => ({ Date: new Date(i.date).toLocaleDateString(), Material: getMaterialName(i.material_id), Type: i.type, Quantity: i.quantity, Unit: getMaterialUnit(i.material_id) })));
      addSheet('Documents', projectDocuments.map(d => ({ 'Date Added': new Date(d.created_at).toLocaleDateString(), Name: d.document_name, Description: d.description })));
      addSheet('Photos', projectPhotos.map(p => ({ 'Date Added': new Date(p.created_at).toLocaleDateString(), Description: p.description })));

      XLSX.writeFile(wb, `Project_Report_${project.name}.xlsx`);
    }
  };


  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage and track your construction sites efficiently.</p>
        </div>
        <div className='flex items-center gap-3'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl border-border/50 shadow-sm"><Download className="mr-2 h-4 w-4" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={exportToPDF}><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel}><File className="mr-2 h-4 w-4" /> Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {appUser?.role === 'admin' && (
            <Button onClick={handleAddClick} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-4 w-4" /> New Project
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <FolderKanban className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 h-14 bg-card border-border/50 shadow-sm rounded-2xl focus:ring-2 focus:ring-primary/20 transition-all text-base"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-xl border border-border/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 shadow-sm border-l-4 border-l-emerald-500 flex flex-col justify-center">
          <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 upper-case tracking-tighter mb-0.5">Total Income</p>
          <div className="text-sm font-bold text-emerald-900 dark:text-emerald-300 truncate leading-none">₹{formatCurrency(summary.totalIncome, true)}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-rose-50/50 dark:bg-rose-950/20 p-3 shadow-sm border-l-4 border-l-rose-500 flex flex-col justify-center">
          <p className="text-[9px] font-bold text-rose-700 dark:text-rose-400 upper-case tracking-tighter mb-0.5">Total Expense</p>
          <div className="text-sm font-bold text-rose-900 dark:text-rose-300 truncate leading-none">₹{formatCurrency(summary.totalExpense, true)}</div>
        </div>
        <div className={cn("rounded-xl border border-border/50 p-3 shadow-sm border-l-4 flex flex-col justify-center", summary.netBalance >= 0 ? "bg-blue-50/50 dark:bg-blue-950/20 border-l-blue-500" : "bg-orange-50/50 dark:bg-orange-950/20 border-l-orange-500")}>
          <p className={cn("text-[9px] font-bold uppercase tracking-tighter mb-0.5", summary.netBalance >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400")}>Net Balance</p>
          <div className={cn("text-sm font-bold truncate leading-none", summary.netBalance >= 0 ? "text-blue-900 dark:text-blue-300" : "text-orange-900 dark:text-orange-300")}>₹{formatCurrency(summary.netBalance, true)}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-xl border border-border/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 shadow-sm border-l-4 border-l-emerald-500 flex flex-col justify-center">
          <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 upper-case tracking-tighter mb-0.5">Receivable</p>
          <div className="text-sm font-bold text-emerald-900 dark:text-emerald-300 truncate leading-none">₹{formatCurrency(summary.totalReceivable, true)}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-rose-50/50 dark:bg-rose-950/20 p-3 shadow-sm border-l-4 border-l-rose-500 flex flex-col justify-center">
          <p className="text-[9px] font-bold text-rose-700 dark:text-rose-400 upper-case tracking-tighter mb-0.5">Payable</p>
          <div className="text-sm font-bold text-rose-900 dark:text-rose-300 truncate leading-none">₹{formatCurrency(summary.totalPayable, true)}</div>
        </div>
        <div className={cn("rounded-xl border border-border/50 p-3 shadow-sm border-l-4 flex flex-col justify-center", summary.netOutstanding >= 0 ? "bg-blue-50/50 dark:bg-blue-950/20 border-l-blue-500" : "bg-orange-50/50 dark:bg-orange-950/20 border-l-orange-500")}>
          <p className={cn("text-[9px] font-bold uppercase tracking-tighter mb-0.5", summary.netOutstanding >= 0 ? "text-blue-700 dark:text-blue-400" : "text-orange-700 dark:text-orange-400")}>Net Outstanding</p>
          <div className={cn("text-sm font-bold truncate leading-none", summary.netOutstanding >= 0 ? "text-blue-900 dark:text-blue-300" : "text-orange-900 dark:text-orange-300")}>₹{formatCurrency(summary.netOutstanding, true)}</div>
        </div>
      </div>

      {!isLoaded ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="rounded-2xl border-border/50 bg-card overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-2/3 rounded-lg" />
                <Skeleton className="h-4 w-1/2 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/4 rounded-lg" />
                  <Skeleton className="h-4 w-1/4 rounded-lg" />
                </div>
                <Skeleton className="h-10 w-full rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <>
          {/* Mobile View */}
          <div className="md:hidden">
            {filteredProjects.map((project) => {
              const { income, expenses, net } = calculateProjectFinancials(project.id);
              return (
                <Card key={project.id} className="border-x-0 border-t-0 rounded-none first:border-t bg-card">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{project.name}</p>
                        {project.location && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold opacity-70 mt-0.5">
                            <span className="w-1 h-1 rounded-full bg-primary/40"></span>
                            {project.location}
                          </p>
                        )}
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-2 font-medium">
                          <span className="text-emerald-600 dark:text-emerald-400">In: {formatCurrency(income)}</span>
                          <span className="text-rose-600 dark:text-rose-400">Out: {formatCurrency(expenses)}</span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <p className={cn('font-bold text-sm', net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>
                          {formatCurrency(net)}
                        </p>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-xl">
                            <DropdownMenuItem onClick={() => setViewingProject(project)}>
                              <View className="mr-2 h-4 w-4" /> View Project Summary
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Download className="mr-2 h-4 w-4" /> Export Report
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent className="rounded-xl">
                                  <DropdownMenuItem onClick={() => exportProjectReport(project, 'pdf')}><FileText className="mr-2 h-4 w-4" /> PDF Report</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => exportProjectReport(project, 'excel')}><File className="mr-2 h-4 w-4" /> Excel Report</DropdownMenuItem>
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            {appUser?.role === 'admin' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEditClick(project)}>
                                  <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive font-medium" onClick={() => setDeletingProject(project)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block">
            <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Name</TableHead>
                      <TableHead className="text-right">Income</TableHead>
                      <TableHead className="text-right">Expense</TableHead>
                      <TableHead className="text-right">Net Balance</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => {
                      const { income, expenses, net } = calculateProjectFinancials(project.id);
                      return (
                        <TableRow key={project.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">
                            <div className="space-y-0.5">
                              <p className="font-bold tracking-tight">{project.name}</p>
                              {project.location && <p className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wider font-semibold opacity-70"><span className="w-1 h-1 rounded-full bg-primary/40"></span>{project.location}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(income)}</TableCell>
                          <TableCell className="text-right text-rose-600 dark:text-rose-400 font-medium">{formatCurrency(expenses)}</TableCell>
                          <TableCell className={cn('text-right font-bold', net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')}>
                            {formatCurrency(net)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-xl">
                                <DropdownMenuItem onClick={() => setViewingProject(project)}>
                                  <View className="mr-2 h-4 w-4" /> View Project Summary
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <Download className="mr-2 h-4 w-4" /> Export Report
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                    <DropdownMenuSubContent className="rounded-xl">
                                      <DropdownMenuItem onClick={() => exportProjectReport(project, 'pdf')}><FileText className="mr-2 h-4 w-4" /> PDF Report</DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => exportProjectReport(project, 'excel')}><File className="mr-2 h-4 w-4" /> Excel Report</DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                                </DropdownMenuSub>
                                {appUser?.role === 'admin' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleEditClick(project)}>
                                      <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive font-medium" onClick={() => setDeletingProject(project)}>
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-3xl bg-muted/20 border-2 border-dashed border-border/50">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <FolderKanban className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">{searchTerm ? 'No results found' : 'Get started with projects'}</h3>
          <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
            {searchTerm ? `We couldn't find any projects matching "${searchTerm}".` : appUser?.role === 'admin' ? 'Create your first construction project to start tracking your labor, materials, and financials.' : 'You are not assigned to any projects yet.'}
          </p>
          {!searchTerm && appUser?.role === 'admin' &&
            <Button className="mt-8 rounded-xl bg-primary px-8 h-12 shadow-lg shadow-primary/20" onClick={handleAddClick}>
              <PlusCircle className="mr-2 h-5 w-5" />
              Create First Project
            </Button>
          }
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit' : 'Create a New'} Project</DialogTitle>
            <DialogDescription>
              {editingProject ? 'Update the details of your project.' : 'Add a new construction project to start tracking it.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ProjectForm setOpen={setFormOpen} project={editingProject} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingProject} onOpenChange={() => setViewingProject(undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewingProject?.name}</DialogTitle>
            <DialogDescription>
              {viewingProject?.location || 'A detailed overview of the project.'}
            </DialogDescription>
          </DialogHeader>
          {viewingProject && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold">Financials</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className='text-muted-foreground'>Total Income</div> <div className='text-right font-semibold text-green-600'>{formatCurrency(calculateProjectFinancials(viewingProject.id).income)}</div>
                  <div className='text-muted-foreground'>Total Expenses</div> <div className='text-right font-semibold text-red-600'>{formatCurrency(calculateProjectFinancials(viewingProject.id).expenses)}</div>
                  <div className='text-muted-foreground font-bold'>Net Total</div> <div className={cn('text-right font-bold', calculateProjectFinancials(viewingProject.id).net >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(calculateProjectFinancials(viewingProject.id).net)}</div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold">Statistics</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className='text-muted-foreground'>Transactions</div><div className='text-right'><Badge variant='outline'>{transactions.filter(t => t.project_id === viewingProject.id).length}</Badge></div>
                  <div className='text-muted-foreground'>Outstandings</div><div className='text-right'><Badge variant='outline'>{recordables.filter(t => t.project_id === viewingProject.id).length}</Badge></div>
                  <div className='text-muted-foreground'>Tasks</div><div className='text-right'><Badge variant='outline'>{tasks.filter(t => t.project_id === viewingProject.id).length}</Badge></div>
                  <div className='text-muted-foreground'>Documents</div><div className='text-right'><Badge variant='outline'>{documents.filter(t => t.project_id === viewingProject.id).length}</Badge></div>
                  <div className='text-muted-foreground'>Photos</div><div className='text-right'><Badge variant='outline'>{photos.filter(t => t.project_id === viewingProject.id).length}</Badge></div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingProject} onOpenChange={(open) => { if (!open) { setDeletingProject(undefined); setDeleteConfirmation(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the <strong>{deletingProject?.name}</strong> project and all its associated data. To confirm, type the project name below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Project Name</Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder={deletingProject?.name}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmation !== deletingProject?.name}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}


