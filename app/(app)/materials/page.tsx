
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreVertical, Pencil, Trash2, Layers, History, Warehouse, FileText, FilterX, Filter, File, View, Lock, ArrowUpCircle, ArrowDownCircle, Download } from 'lucide-react';
import { useAppState } from '@/hooks/use-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Material, MaterialLedgerEntry } from '@/lib/definitions';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deleteMaterial, deleteMaterialLedgerEntry } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMaterialForms } from '@/components/material-forms-provider';

const ALL_PROJECTS = 'all';
const ALL_MATERIALS = 'all';
const ALL_USERS = 'all-users';


type InventoryDetailItem = {
  materialId: string;
  projectId: string;
}

export default function MaterialsPage() {
  const { materials, material_ledger, projects, users, userVisibleProjects, currentUser, isLoaded } = useAppState();
  const { toast } = useToast();
  const {
    setEditingMaterial,
    setMaterialFormOpen,
    setEditingLedgerEntry,
    setStockInSheetOpen,
    setStockOutSheetOpen,
  } = useMaterialForms();

  // State for deleting items
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [deletingLedgerEntry, setDeletingLedgerEntry] = useState<MaterialLedgerEntry | null>(null);
  const [requestMessage, setRequestMessage] = useState('');


  // State for filters and search
  const [inventoryProjectFilter, setInventoryProjectFilter] = useState<string>(ALL_PROJECTS);
  const [localInventoryProjectFilter, setLocalInventoryProjectFilter] = useState<string>(ALL_PROJECTS);
  const [isInventoryFilterOpen, setIsInventoryFilterOpen] = useState(false);
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');

  const [ledgerProjectFilter, setLedgerProjectFilter] = useState<string>(ALL_PROJECTS);
  const [localLedgerProjectFilter, setLocalLedgerProjectFilter] = useState<string>(ALL_PROJECTS);
  const [ledgerMaterialFilter, setLedgerMaterialFilter] = useState<string>(ALL_MATERIALS);
  const [localLedgerMaterialFilter, setLocalLedgerMaterialFilter] = useState<string>(ALL_MATERIALS);
  const [ledgerUserFilter, setLedgerUserFilter] = useState<string>(ALL_USERS);
  const [localLedgerUserFilter, setLocalLedgerUserFilter] = useState<string>(ALL_USERS);
  const [isLedgerFilterOpen, setIsLedgerFilterOpen] = useState(false);

  const [inventoryDetailItem, setInventoryDetailItem] = useState<InventoryDetailItem | null>(null);


  const handleAddMaterialClick = () => {
    setEditingMaterial(undefined);
    setMaterialFormOpen(true);
  };

  const handleEditMaterialClick = (material: Material) => {
    setEditingMaterial(material);
    setMaterialFormOpen(true);
  };

  const handleDeleteMaterialClick = (material: Material) => {
    setDeletingMaterial(material);
    setRequestMessage('');
  };


  const handleDeleteMaterialConfirm = async () => {
    if (deletingMaterial && currentUser) {
      await deleteMaterial(deletingMaterial.id, currentUser, requestMessage);
      toast({
        title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
        description: currentUser.role === 'admin' ? 'Material has been deleted.' : 'Deletion request has been submitted for approval.',
      });
      setDeletingMaterial(null);
    }
  };

  const handleEditLedgerEntry = (entry: MaterialLedgerEntry) => {
    setEditingLedgerEntry(entry);
    if (entry.type === 'in') {
      setStockInSheetOpen(true);
    } else {
      setStockOutSheetOpen(true);
    }
  };

  const handleDeleteLedgerEntryClick = (entry: MaterialLedgerEntry) => {
    setDeletingLedgerEntry(entry);
    setRequestMessage('');
  }

  const handleDeleteLedgerEntryConfirm = async () => {
    if (deletingLedgerEntry && currentUser) {
      await deleteMaterialLedgerEntry(deletingLedgerEntry.id, currentUser, requestMessage);
      toast({
        title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
        description: currentUser.role === 'admin' ? 'Ledger entry has been deleted.' : 'Your delete request has been submitted for approval.'
      });
      setDeletingLedgerEntry(null);
    }
  };

  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name || 'N/A';
  const getMaterialName = (id: string) => materials.find((m) => m.id === id)?.name || 'N/A';
  const getMaterialUnit = (id: string) => materials.find((m) => m.id === id)?.unit || '';
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';


  const inventory = useMemo(() => {
    const stock: { [materialId: string]: { [projectId: string]: number } } = {};

    material_ledger.forEach(entry => {
      if (!stock[entry.material_id]) stock[entry.material_id] = {};
      if (!stock[entry.material_id][entry.project_id]) stock[entry.material_id][entry.project_id] = 0;

      if (entry.type === 'in') {
        stock[entry.material_id][entry.project_id] += entry.quantity;
      } else {
        stock[entry.material_id][entry.project_id] -= entry.quantity;
      }
    });

    let inventoryList: { materialId: string; projectId: string; stock: number }[] = [];
    for (const materialId in stock) {
      for (const projectId in stock[materialId]) {
        if (inventoryProjectFilter === ALL_PROJECTS || projectId === inventoryProjectFilter) {
          inventoryList.push({ materialId, projectId, stock: stock[materialId][projectId] });
        }
      }
    }

    if (materialSearchTerm) {
      inventoryList = inventoryList.filter(item => getMaterialName(item.materialId).toLowerCase().includes(materialSearchTerm.toLowerCase()));
    }

    return inventoryList.sort((a, b) => getMaterialName(a.materialId).localeCompare(getMaterialName(b.materialId)));
  }, [material_ledger, inventoryProjectFilter, materialSearchTerm, getMaterialName]);

  const filteredLedger = useMemo(() => {
    let ledger = [...material_ledger].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (ledgerProjectFilter !== ALL_PROJECTS) {
      ledger = ledger.filter(entry => entry.project_id === ledgerProjectFilter);
    }

    if (ledgerMaterialFilter !== ALL_MATERIALS) {
      ledger = ledger.filter(entry => entry.material_id === ledgerMaterialFilter);
    }

    if (ledgerUserFilter !== ALL_USERS) {
      ledger = ledger.filter(entry => entry.created_by === ledgerUserFilter);
    }

    return ledger;
  }, [material_ledger, ledgerProjectFilter, ledgerMaterialFilter, ledgerUserFilter]);

  const inventoryDetailLedger = useMemo(() => {
    if (!inventoryDetailItem) return [];
    return material_ledger
      .filter(
        (entry) =>
          entry.material_id === inventoryDetailItem.materialId &&
          entry.project_id === inventoryDetailItem.projectId
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [inventoryDetailItem, material_ledger]);

  const filteredMaterials = useMemo(() => {
    if (!materialSearchTerm) return materials;
    return materials.filter(m => m.name.toLowerCase().includes(materialSearchTerm.toLowerCase()));
  }, [materials, materialSearchTerm]);

  const isInventoryFiltered = inventoryProjectFilter !== ALL_PROJECTS;

  const applyInventoryFilters = () => {
    setInventoryProjectFilter(localInventoryProjectFilter);
    setIsInventoryFilterOpen(false);
  }

  const clearInventoryFilters = () => {
    setLocalInventoryProjectFilter(ALL_PROJECTS);
    setInventoryProjectFilter(ALL_PROJECTS);
    setIsInventoryFilterOpen(false);
  }

  const isLedgerFiltered = ledgerProjectFilter !== ALL_PROJECTS || ledgerMaterialFilter !== ALL_MATERIALS || ledgerUserFilter !== ALL_USERS;

  const summary = useMemo(() => {
    if (!isLoaded) return { totalMaterials: 0, totalIn: 0, totalOut: 0 };
    return {
      totalMaterials: materials.length,
      totalIn: material_ledger.filter(l => l.type === 'in').length,
      totalOut: material_ledger.filter(l => l.type === 'out').length,
    };
  }, [materials, material_ledger, isLoaded]);

  const applyLedgerFilters = () => {
    setLedgerProjectFilter(localLedgerProjectFilter);
    setLedgerMaterialFilter(localLedgerMaterialFilter);
    setLedgerUserFilter(localLedgerUserFilter);
    setIsLedgerFilterOpen(false);
  }

  const clearLedgerFilters = () => {
    setLocalLedgerProjectFilter(ALL_PROJECTS);
    setLedgerProjectFilter(ALL_PROJECTS);
    setLocalLedgerMaterialFilter(ALL_MATERIALS);
    setLedgerMaterialFilter(ALL_MATERIALS);
    setLocalLedgerUserFilter(ALL_USERS);
    setLedgerUserFilter(ALL_USERS);
    setIsLedgerFilterOpen(false);
  }

  const exportToPDF = (type: 'inventory' | 'ledger') => {
    const doc = new jsPDF();
    doc.setFontSize(18);

    if (type === 'inventory') {
      if (inventory.length === 0) { toast({ title: "No data to export", variant: "destructive" }); return; }
      doc.text("Inventory Stock Report", 14, 22);
      autoTable(doc, {
        head: [['Material', 'Project', 'Current Stock']],
        body: inventory.map(item => [
          getMaterialName(item.materialId),
          getProjectName(item.projectId),
          `${item.stock} ${getMaterialUnit(item.materialId)}`
        ]),
        startY: 30,
      });
      doc.save('inventory_report.pdf');

    } else { // ledger
      if (filteredLedger.length === 0) { toast({ title: "No data to export", variant: "destructive" }); return; }
      doc.text("Material Ledger Report", 14, 22);
      autoTable(doc, {
        head: [['Date', 'Material', 'Project', 'Type', 'Quantity', 'Entry By', 'Description']],
        body: filteredLedger.map(entry => [
          new Date(entry.date).toLocaleDateString(),
          getMaterialName(entry.material_id),
          getProjectName(entry.project_id),
          entry.type === 'in' ? 'Stock In' : 'Stock Out',
          `${entry.quantity} ${getMaterialUnit(entry.material_id)}`,
          entry.created_by ? getUserName(entry.created_by) : 'Admin',
          entry.description || ''
        ]),
        startY: 30,
      });
      doc.save('material_ledger_report.pdf');
    }
  };

  const exportInventoryDetailToPdf = () => {
    if (!inventoryDetailItem || inventoryDetailLedger.length === 0) {
      toast({ title: 'No details to export', variant: 'destructive' });
      return;
    }
    const doc = new jsPDF();
    const materialName = getMaterialName(inventoryDetailItem.materialId);
    const projectName = getProjectName(inventoryDetailItem.projectId);

    doc.setFontSize(18);
    doc.text(`Movement History: ${materialName}`, 14, 22);
    doc.setFontSize(12);
    doc.text(`Project: ${projectName}`, 14, 30);

    autoTable(doc, {
      head: [['Date', 'Type', 'Quantity', 'Description']],
      body: inventoryDetailLedger.map((entry) => [
        new Date(entry.date).toLocaleDateString(),
        entry.type === 'in' ? 'Stock In' : 'Stock Out',
        `${entry.quantity} ${getMaterialUnit(entry.material_id)}`,
        entry.description || '',
      ]),
      startY: 40,
    });

    doc.save(`history_${materialName}_${projectName}.pdf`);
  };

  const exportToExcel = (type: 'inventory' | 'ledger') => {
    if (type === 'inventory') {
      if (inventory.length === 0) { toast({ title: "No data to export", variant: "destructive" }); return; }
      const worksheet = XLSX.utils.json_to_sheet(inventory.map(item => ({
        Material: getMaterialName(item.materialId),
        Project: getProjectName(item.projectId),
        Stock: item.stock,
        Unit: getMaterialUnit(item.materialId)
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
      XLSX.writeFile(workbook, "inventory.xlsx");
    } else { // ledger
      if (filteredLedger.length === 0) { toast({ title: "No data to export", variant: "destructive" }); return; }
      const worksheet = XLSX.utils.json_to_sheet(filteredLedger.map(entry => ({
        Date: new Date(entry.date).toLocaleDateString(),
        Material: getMaterialName(entry.material_id),
        Project: getProjectName(entry.project_id),
        Type: entry.type === 'in' ? 'Stock In' : 'Stock Out',
        Quantity: entry.quantity,
        Unit: getMaterialUnit(entry.material_id),
        'Entry By': entry.created_by ? getUserName(entry.created_by) : 'Admin',
        Description: entry.description || ''
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "MaterialLedger");
      XLSX.writeFile(workbook, "material_ledger.xlsx");
    }
  };


  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Material Management</h1>
          <p className="text-sm text-muted-foreground">Track inventory levels and material movements across projects.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setMaterialFormOpen(true)} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
            <Layers className="mr-2 h-4 w-4" />
            New Material
          </Button>
          <Button onClick={() => setStockInSheetOpen(true)} variant="outline" className="rounded-xl border-border/50 shadow-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200">
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Stock In
          </Button>
          <Button onClick={() => setStockOutSheetOpen(true)} variant="outline" className="rounded-xl border-border/50 shadow-sm bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border-rose-200">
            <ArrowDownCircle className="mr-2 h-4 w-4" />
            Stock Out
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border/50 bg-slate-50/30 dark:bg-slate-900/20 p-2.5 shadow-sm border-l-4 border-l-slate-400 dark:border-l-slate-500 flex flex-col justify-center">
          <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter mb-0.5">Materials</p>
          <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate leading-none">{summary.totalMaterials} Items</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-emerald-50/30 dark:bg-emerald-900/10 p-2.5 shadow-sm border-l-4 border-l-emerald-500 flex flex-col justify-center">
          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter mb-0.5">Stock In</p>
          <div className="text-sm font-bold text-emerald-900 dark:text-emerald-100 truncate leading-none">{summary.totalIn} Entries</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-rose-50/30 dark:bg-rose-900/10 p-2.5 shadow-sm border-l-4 border-l-rose-500 flex flex-col justify-center">
          <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-tighter mb-0.5">Stock Out</p>
          <div className="text-sm font-bold text-rose-900 dark:text-rose-100 truncate leading-none">{summary.totalOut} Entries</div>
        </div>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="bg-muted p-1 rounded-xl flex items-center gap-1 border border-border/50 w-fit mb-4">
          <TabsTrigger value="inventory" className="rounded-lg px-4 h-8 text-xs transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">Inventory</TabsTrigger>
          <TabsTrigger value="ledger" className="rounded-lg px-4 h-8 text-xs transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">Ledger</TabsTrigger>
          <TabsTrigger value="materials" className="rounded-lg px-4 h-8 text-xs transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">Materials List</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between p-4 pb-2">
              <div>
                <CardTitle className="text-base font-bold">Current Stock Levels</CardTitle>
                <CardDescription className="text-xs">An overview of your material inventory.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu open={isInventoryFilterOpen} onOpenChange={setIsInventoryFilterOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Filter className="mr-0 md:mr-2 h-3.5 w-3.5" />
                      <span className="hidden md:inline">Filters</span>
                      {isInventoryFiltered && <span className="ml-2 h-1.5 w-1.5 rounded-full bg-primary" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-80 p-3 space-y-3"
                    align="end"
                  >
                    <div className="grid gap-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project</Label>
                      <Combobox
                        options={[
                          { value: ALL_PROJECTS, label: 'All Projects' },
                          ...userVisibleProjects.map(p => ({ value: p.id, label: p.name }))
                        ]}
                        value={localInventoryProjectFilter}
                        onChange={setLocalInventoryProjectFilter}
                        placeholder="All Projects"
                        searchPlaceholder="Search projects..."
                        notFoundMessage="No projects found."
                      />
                    </div>
                    <DropdownMenuSeparator />
                    <div className="flex justify-between items-center bg-muted/30 -mx-3 -mb-3 p-3">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearInventoryFilters} disabled={!isInventoryFiltered}><FilterX className="mr-2 h-3.5 w-3.5" />Clear</Button>
                      <Button size="sm" className="h-8 text-xs" onClick={applyInventoryFilters}>Apply Filters</Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs"><Download className="mr-0 md:mr-2 h-3.5 w-3.5" /> <span className="hidden md:inline">Export</span></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40">
                    <DropdownMenuItem className="text-xs" onClick={() => exportToPDF('inventory')}><FileText className="mr-2 h-3.5 w-3.5" /> PDF</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs" onClick={() => exportToExcel('inventory')}><File className="mr-2 h-3.5 w-3.5" /> Excel</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-3 border-b bg-muted/5">
                <Input
                  placeholder="Search materials in inventory..."
                  value={materialSearchTerm}
                  onChange={(e) => setMaterialSearchTerm(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              {isLoaded && inventory.length > 0 ? (
                <ul className="divide-y divide-border/50">
                  {inventory.map(item => (
                    <li key={`${item.materialId}-${item.projectId}`} className="p-3 flex justify-between items-center hover:bg-muted/5 transition-colors">
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm text-foreground">{getMaterialName(item.materialId)}</p>
                        <p className="text-[11px] font-medium text-muted-foreground">{getProjectName(item.projectId)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-sm text-foreground">{item.stock}</p>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{getMaterialUnit(item.materialId)}</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-lg px-2" onClick={() => setInventoryDetailItem({ materialId: item.materialId, projectId: item.projectId })}>
                          <View className="mr-1.5 h-3 w-3" />
                          History
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="h-24 text-center flex items-center justify-center">
                  <p className="text-muted-foreground">No inventory data for the selected filter.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between p-4 pb-2">
              <div>
                <CardTitle className="text-base font-bold">Material Ledger</CardTitle>
                <CardDescription className="text-xs">A log of all material movements (stock in/out).</CardDescription>
              </div>
              <div className="flex gap-2">
                <DropdownMenu open={isLedgerFilterOpen} onOpenChange={setIsLedgerFilterOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                      <Filter className="mr-0 md:mr-2 h-3.5 w-3.5" />
                      <span className="hidden md:inline">Filters</span>
                      {isLedgerFiltered && <span className="ml-2 h-1.5 w-1.5 rounded-full bg-primary" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-80 p-3 space-y-3"
                    align="end"
                  >
                    <div className="grid gap-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project</Label>
                      <Combobox
                        options={[
                          { value: ALL_PROJECTS, label: 'All Projects' },
                          ...userVisibleProjects.map(p => ({ value: p.id, label: p.name }))
                        ]}
                        value={localLedgerProjectFilter}
                        onChange={setLocalLedgerProjectFilter}
                        placeholder="All Projects"
                        searchPlaceholder="Search projects..."
                        notFoundMessage="No projects found."
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Material</Label>
                      <Combobox
                        options={[
                          { value: ALL_MATERIALS, label: 'All Materials' },
                          ...materials.map(m => ({ value: m.id, label: m.name }))
                        ]}
                        value={localLedgerMaterialFilter}
                        onChange={setLocalLedgerMaterialFilter}
                        placeholder="All Materials"
                        searchPlaceholder="Search materials..."
                        notFoundMessage="No materials found."
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Entry By</Label>
                      <Combobox
                        options={[
                          { value: ALL_USERS, label: 'All Users' },
                          ...users.map(u => ({ value: u.id, label: u.name }))
                        ]}
                        value={localLedgerUserFilter}
                        onChange={setLocalLedgerUserFilter}
                        placeholder="All Users"
                        searchPlaceholder="Search users..."
                        notFoundMessage="No users found."
                      />
                    </div>
                    <DropdownMenuSeparator />
                    <div className="flex justify-between items-center bg-muted/30 -mx-3 -mb-3 p-3">
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearLedgerFilters} disabled={!isLedgerFiltered}><FilterX className="mr-2 h-3.5 w-3.5" />Clear</Button>
                      <Button size="sm" className="h-8 text-xs" onClick={applyLedgerFilters}>Apply Filters</Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs"><Download className="mr-0 md:mr-2 h-3.5 w-3.5" /> <span className="hidden md:inline">Export</span></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-40">
                    <DropdownMenuItem className="text-xs" onClick={() => exportToPDF('ledger')}><FileText className="mr-2 h-3.5 w-3.5" /> PDF</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs" onClick={() => exportToExcel('ledger')}><File className="mr-2 h-3.5 w-3.5" /> Excel</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile View */}
              <div className="md:hidden">
                {isLoaded && filteredLedger.length > 0 ? (
                  <div className="grid grid-cols-1 divide-y divide-border/50">
                    {filteredLedger.map(entry => (
                      <div key={entry.id} className="p-4 space-y-3 hover:bg-muted/5 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-bold text-sm text-foreground">{getMaterialName(entry.material_id)}</p>
                            <p className="text-[11px] font-medium text-muted-foreground">{getProjectName(entry.project_id)}</p>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter",
                            entry.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          )}>
                            {entry.type === 'in' ? 'Stock In' : 'Stock Out'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-1">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quantity</p>
                            <p className="text-xs font-semibold">{entry.quantity} {getMaterialUnit(entry.material_id)}</p>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date</p>
                            <p className="text-xs font-semibold">{new Date(entry.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                              {getUserName(entry.created_by || '').charAt(0)}
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground">By {entry.created_by ? getUserName(entry.created_by) : 'Admin'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditLedgerEntry(entry)}>
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive focus:text-destructive" onClick={() => handleDeleteLedgerEntryClick(entry)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground bg-muted/5">
                    <History className="mx-auto h-8 w-8 opacity-20 mb-2" />
                    <p className="text-sm font-medium">No ledger entries found.</p>
                  </div>
                )}
              </div>
              {/* Desktop View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[100px] text-xs font-bold uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Material</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Project</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Type</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Quantity</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Entry By</TableHead>
                      <TableHead className="text-xs font-bold uppercase tracking-wider">Challan</TableHead>
                      <TableHead className="w-[80px] text-right text-xs font-bold uppercase tracking-wider">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoaded && filteredLedger.map((entry) => {
                      const isPending = entry.approval_status && entry.approval_status !== 'approved';
                      return (
                        <TableRow key={entry.id} className="group hover:bg-muted/5 transition-colors">
                          <TableCell className="text-xs font-medium">{new Date(entry.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <p className="font-bold text-sm">{getMaterialName(entry.material_id)}</p>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            <p className="text-xs font-medium text-muted-foreground">{getProjectName(entry.project_id)}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={cn(
                              "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter whitespace-nowrap",
                              entry.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            )}>
                              {entry.type === 'in' ? 'In' : 'Out'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <p className="text-sm font-bold">{entry.quantity} <span className="text-[10px] font-medium text-muted-foreground uppercase">{getMaterialUnit(entry.material_id)}</span></p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-medium">{entry.created_by ? getUserName(entry.created_by) : 'Admin'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.challan_url ? (
                              <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                                <a href={entry.challan_url} target="_blank" rel="noopener noreferrer">
                                  <FileText className="h-3.5 w-3.5 text-primary" />
                                </a>
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground italic pl-2">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleEditLedgerEntry(entry)} disabled={isPending}>
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive" onClick={() => handleDeleteLedgerEntryClick(entry)} disabled={isPending}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {isLoaded && filteredLedger.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground font-medium">
                          No ledger entries found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="materials" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between p-4 pb-2">
              <div>
                <CardTitle className="text-base font-bold">Defined Materials</CardTitle>
                <CardDescription className="text-xs">The types of materials you use in your projects.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-3 border-b bg-muted/5">
                <Input
                  placeholder="Search for a material..."
                  value={materialSearchTerm}
                  onChange={(e) => setMaterialSearchTerm(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              {isLoaded && filteredMaterials.length > 0 ? (
                <ul className="divide-y divide-border/50">
                  {filteredMaterials.map((material) => {
                    const isPending = material.approval_status && material.approval_status !== 'approved';
                    return (
                      <li key={material.id} className="p-3 flex justify-between items-center hover:bg-muted/5 transition-colors">
                        <div className="space-y-0.5">
                          <p className="font-bold text-sm text-foreground">{material.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider">{material.unit}</span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem className="text-xs" onClick={() => handleEditMaterialClick(material)} disabled={isPending}>
                              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs text-destructive focus:text-destructive" onClick={() => handleDeleteMaterialClick(material)} disabled={isPending}>
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="h-24 text-center flex items-center justify-center bg-muted/5">
                  <p className="text-muted-foreground text-sm font-medium">{materialSearchTerm ? 'No materials found.' : 'No materials defined.'}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs >

      <Dialog open={!!inventoryDetailItem} onOpenChange={() => setInventoryDetailItem(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="flex-row items-center justify-between">
            <div>
              <DialogTitle>Movement History: {inventoryDetailItem ? getMaterialName(inventoryDetailItem.materialId) : ''}</DialogTitle>
              <DialogDescription>
                Project: {inventoryDetailItem ? getProjectName(inventoryDetailItem.projectId) : ''}
              </DialogDescription>
            </div>
            <Button variant="outline" onClick={exportInventoryDetailToPdf} disabled={inventoryDetailLedger.length === 0} size="sm">
              <FileText className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Export PDF</span>
            </Button>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Type</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Quantity</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryDetailLedger.length > 0 ? (
                  inventoryDetailLedger.map(entry => (
                    <TableRow key={entry.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="text-xs font-medium">{new Date(entry.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter whitespace-nowrap",
                          entry.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        )}>
                          {entry.type === 'in' ? 'In' : 'Out'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        {entry.quantity} <span className="text-[10px] font-medium text-muted-foreground uppercase">{getMaterialUnit(entry.material_id)}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.description || '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No movement history for this item.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>


      <AlertDialog open={!!deletingMaterial} onOpenChange={() => setDeletingMaterial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {currentUser?.role === 'admin' ?
                'This will permanently delete this material and all its ledger entries. This action cannot be undone.' :
                'This will submit a deletion request to the admin.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          {currentUser?.role !== 'admin' && (
            <div className="py-4 space-y-2">
              <Label htmlFor="request_message">Message for Admin (Optional)</Label>
              <Textarea
                id="request_message"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="e.g., This material is a duplicate."
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMaterialConfirm}>
              {currentUser?.role === 'admin' ? 'Delete' : 'Submit Deletion Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingLedgerEntry} onOpenChange={() => setDeletingLedgerEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {currentUser?.role === 'admin' ?
                'This action cannot be undone. This will permanently delete this ledger entry.' :
                'This will submit a deletion request to the admin.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          {currentUser?.role !== 'admin' && (
            <div className="py-4 space-y-2">
              <Label htmlFor="request_message">Message for Admin (Optional)</Label>
              <Textarea
                id="request_message"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="e.g., This was logged with the wrong quantity."
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLedgerEntryConfirm}>
              {currentUser?.role === 'admin' ? 'Delete' : 'Submit Deletion Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}


