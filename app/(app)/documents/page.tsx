
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, FileText as FileTextIcon, Download, List, MoreVertical, Pencil, Lock, Filter, FilterX, File, View } from 'lucide-react';
import { useAppState } from '@/hooks/use-store';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentForm } from '@/components/document-form';
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
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { deleteAppDocument } from '@/lib/store';
import type { Document as AppDocument } from '@/lib/definitions';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';


const ALL_PROJECTS = 'all';
const REJECTION_LIMIT = 3;


export default function DocumentsPage() {
  const { documents, projects, currentUser, userVisibleProjects, isLoaded } = useAppState();
  const { toast } = useToast();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<AppDocument | undefined>(undefined);
  const [viewingDoc, setViewingDoc] = useState<AppDocument | undefined>(undefined);

  const [selectedProject, setSelectedProject] = useState<string>(ALL_PROJECTS);
  const [localSelectedProject, setLocalSelectedProject] = useState<string>(ALL_PROJECTS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');


  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name || 'Unknown Project';

  const filteredDocuments = useMemo(() => {
    let userDocuments = currentUser?.role === 'admin'
      ? documents
      : documents.filter(d => userVisibleProjects.some(p => p.id === d.project_id));

    if (selectedProject !== ALL_PROJECTS) {
      userDocuments = userDocuments.filter((doc) => doc.project_id === selectedProject);
    }

    return [...userDocuments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [documents, selectedProject, currentUser, userVisibleProjects]);


  const handleAddClick = () => {
    setEditingDoc(undefined);
    setSheetOpen(true);
  };

  const handleEditClick = (doc: AppDocument) => {
    setEditingDoc(doc);
    setSheetOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingDocId(id);
    setRequestMessage('');
  }

  const handleDeleteConfirm = async () => {
    if (deletingDocId && currentUser) {
      if (currentUser.role === 'admin') {
        await deleteAppDocument(deletingDocId, currentUser);
        toast({
          title: 'Success!',
          description: 'Document has been deleted.',
        });
      } else {
        await deleteAppDocument(deletingDocId, currentUser, requestMessage);
        toast({
          title: 'Request Submitted',
          description: 'Your deletion request has been submitted for approval.',
        });
      }
      setDeletingDocId(null);
    }
  };

  const isFiltered = selectedProject !== ALL_PROJECTS;

  const summary = useMemo(() => {
    if (!isLoaded) return { totalDocuments: 0, recent: 'N/A' };
    return {
      totalDocuments: filteredDocuments.length,
      recent: filteredDocuments.length > 0 ? new Date(filteredDocuments[0].created_at).toLocaleDateString() : 'N/A',
    };
  }, [filteredDocuments, isLoaded]);

  const applyFilters = () => {
    setSelectedProject(localSelectedProject);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setLocalSelectedProject(ALL_PROJECTS);
    setSelectedProject(ALL_PROJECTS);
    setIsFilterOpen(false);
  };

  const exportToPDF = () => {
    if (filteredDocuments.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const doc = new jsPDF();
    doc.text('Documents Report', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Document Name', 'Project', 'Description', 'Date Added']],
      body: filteredDocuments.map(d => [
        d.document_name,
        getProjectName(d.project_id),
        d.description,
        new Date(d.created_at).toLocaleDateString(),
      ]),
    });
    doc.save('documents_report.pdf');
  };

  const exportToExcel = () => {
    if (filteredDocuments.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      filteredDocuments.map(d => ({
        'Document Name': d.document_name,
        'Project': getProjectName(d.project_id),
        'Description': d.description,
        'Date Added': new Date(d.created_at).toLocaleDateString(),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Documents');
    XLSX.writeFile(workbook, 'documents_report.xlsx');
  };


  return (
    <TooltipProvider>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">Project Documents</h1>
            <p className="text-sm text-muted-foreground">Blueprint, permits, and shared architectural documents.</p>
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
                className="w-80 p-6 space-y-5 rounded-2xl shadow-xl border-border/50"
                align="end"
              >
                <div className="space-y-4">
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
                <DropdownMenuItem onClick={exportToPDF} className="rounded-lg"><FileTextIcon className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel} className="rounded-lg"><File className="mr-2 h-4 w-4" /> Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={handleAddClick} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div className="rounded-xl border border-border/50 bg-slate-50/30 p-3 shadow-sm border-l-4 border-l-slate-400 flex flex-col justify-center">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter mb-0.5">Documents</p>
            <div className="text-sm font-bold text-slate-900 truncate leading-none">{summary.totalDocuments} Files</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-blue-50/30 p-3 shadow-sm border-l-4 border-l-blue-500 flex flex-col justify-center">
            <p className="text-[9px] font-bold text-blue-700 uppercase tracking-tighter mb-0.5">Last Uploaded</p>
            <div className="text-sm font-bold text-blue-900 truncate leading-none">{summary.recent}</div>
          </div>
        </div>

        {!isLoaded ? (
          <Card className="flex flex-col items-center justify-center py-20 border-dashed">
            <FileTextIcon className="h-16 w-16 text-muted-foreground animate-pulse" />
            <h3 className="mt-4 text-lg font-semibold">Loading Documents...</h3>
          </Card>
        ) : filteredDocuments.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {filteredDocuments.map((doc) => {
                  const isLocked = (doc.rejection_count || 0) >= REJECTION_LIMIT && currentUser?.role !== 'admin';
                  return (
                    <li key={doc.id} className="p-4 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 flex-shrink-0">
                          <FileTextIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold truncate max-w-xs">{doc.document_name}</p>
                          <p className="text-sm text-muted-foreground">{getProjectName(doc.project_id)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setViewingDoc(doc)}>
                          <View className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">View</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <a href={doc.document_url} download={doc.document_name} className='flex items-center'>
                                <Download className="mr-2 h-4 w-4" /> Download
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(doc)} disabled={isLocked || (doc.approval_status && doc.approval_status !== 'approved')}>
                              {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />} Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteClick(doc.id)}
                              disabled={isLocked || (doc.approval_status && doc.approval_status !== 'approved')}
                            >
                              {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex flex-col items-center justify-center py-20 border-dashed">
            <FileTextIcon className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Documents Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Get started by uploading a document to a project.
            </p>
            <Button className="mt-6" onClick={handleAddClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          </Card>
        )
        }

        <Dialog open={isSheetOpen} onOpenChange={setSheetOpen}>
          <DialogContent className="w-full max-w-none sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingDoc ? 'Edit' : 'Add New'} Document</DialogTitle>
              <DialogDescription>{editingDoc ? 'Update the details for this document.' : 'Upload a file (e.g., blueprint, invoice, permit) and link it to a project.'}</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <DocumentForm setOpen={setSheetOpen} initialDoc={editingDoc} />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(undefined)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{viewingDoc?.document_name}</DialogTitle>
              <DialogDescription>
                Project: {viewingDoc ? getProjectName(viewingDoc.project_id) : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <p className="text-sm font-semibold">Description</p>
              <p className="text-sm text-muted-foreground">{viewingDoc?.description}</p>
              <p className="text-xs text-muted-foreground pt-2">
                Added on {viewingDoc ? new Date(viewingDoc.created_at).toLocaleDateString() : ''}
              </p>
            </div>
            <DialogFooter>
              <Button asChild variant="default">
                <a href={viewingDoc?.document_url} download={viewingDoc?.document_name}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingDocId} onOpenChange={() => setDeletingDocId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                {currentUser?.role === 'admin' ? 'This will permanently delete this document.' : 'This will submit a deletion request. If you\'d like, you can provide a message to the admin.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {currentUser?.role !== 'admin' && (
              <div className="py-4 space-y-2">
                <Label htmlFor="request_message">Message for Admin (Optional)</Label>
                <Textarea
                  id="request_message"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="e.g. This document is a duplicate."
                />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>
                {currentUser?.role === 'admin' ? 'Delete Document' : 'Submit Deletion Request'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div >
    </TooltipProvider >
  );
}


