
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Camera, Trash2, Download, Pencil, Lock, Filter, FilterX, FileText, File, MoreVertical, View } from 'lucide-react';
import { useAppState } from '@/hooks/use-store';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { PhotoForm } from '@/components/photo-form';
import Image from 'next/image';
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
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { deletePhoto } from '@/lib/store';
import type { Photo } from '@/lib/definitions';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const ALL_PROJECTS = 'all';
const REJECTION_LIMIT = 3;


export default function GalleryPage() {
  const { photos, projects, currentUser, userVisibleProjects, isLoaded } = useAppState();
  const { toast } = useToast();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<Photo | undefined>(undefined);
  const [viewingPhoto, setViewingPhoto] = useState<Photo | undefined>(undefined);

  const [selectedProject, setSelectedProject] = useState<string>(ALL_PROJECTS);
  const [localSelectedProject, setLocalSelectedProject] = useState<string>(ALL_PROJECTS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');

  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name || 'Unknown Project';

  const filteredPhotos = useMemo(() => {
    let userPhotos = currentUser?.role === 'admin'
      ? photos
      : photos.filter(d => userVisibleProjects.some(p => p.id === d.project_id));

    if (selectedProject !== ALL_PROJECTS) {
      userPhotos = userPhotos.filter((photo) => photo.project_id === selectedProject);
    }

    return [...userPhotos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [photos, selectedProject, currentUser, userVisibleProjects]);


  const handleAddClick = () => {
    setEditingPhoto(undefined);
    setSheetOpen(true);
  };

  const handleEditClick = (photo: Photo) => {
    setEditingPhoto(photo);
    setSheetOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingPhotoId(id);
    setRequestMessage('');
  };

  const handleDeleteConfirm = async () => {
    if (deletingPhotoId && currentUser) {
      if (currentUser.role === 'admin') {
        await deletePhoto(deletingPhotoId, currentUser);
        toast({
          title: 'Success!',
          description: 'Photo has been deleted.',
        });
      } else {
        await deletePhoto(deletingPhotoId, currentUser, requestMessage);
        toast({
          title: 'Request Submitted',
          description: 'Your deletion request has been submitted for approval.',
        });
      }
      setDeletingPhotoId(null);
    }
  };

  const isFiltered = selectedProject !== ALL_PROJECTS;

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
    if (filteredPhotos.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const doc = new jsPDF();
    doc.text('Site Photos Report', 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Project', 'Description', 'Date Added']],
      body: filteredPhotos.map(p => [
        getProjectName(p.project_id),
        p.description,
        new Date(p.created_at).toLocaleDateString(),
      ]),
    });
    doc.save('photos_report.pdf');
  };

  const exportToExcel = () => {
    if (filteredPhotos.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(
      filteredPhotos.map(p => ({
        'Project': getProjectName(p.project_id),
        'Description': p.description,
        'Date Added': new Date(p.created_at).toLocaleDateString(),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Photos');
    XLSX.writeFile(workbook, 'photos_report.xlsx');
  };


  return (
    <TooltipProvider>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">Site Photo Gallery</h1>
            <p className="text-sm text-muted-foreground">A visual timeline of progress across all your construction sites.</p>
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
                <DropdownMenuItem onClick={exportToPDF} className="rounded-lg"><FileText className="mr-2 h-4 w-4" /> PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel} className="rounded-lg"><File className="mr-2 h-4 w-4" /> Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={handleAddClick} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Photo
            </Button>
          </div>
        </div>

        {!isLoaded ? (
          <Card className="flex flex-col items-center justify-center py-20 border-dashed">
            <Camera className="h-16 w-16 text-muted-foreground animate-pulse" />
            <h3 className="mt-4 text-lg font-semibold">Loading Photos...</h3>
          </Card>
        ) : filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPhotos.map((photo) => {
              const isLocked = (photo.rejection_count || 0) >= REJECTION_LIMIT && currentUser?.role !== 'admin';
              return (
                <Card key={photo.id} className="group overflow-hidden rounded-2xl border-border/50 bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
                  <div className="aspect-video relative w-full cursor-pointer overflow-hidden" onClick={() => setViewingPhoto(photo)}>
                    <Image
                      src={photo.image_url}
                      alt={photo.description}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button variant="secondary" size="sm" className="rounded-full bg-white/90 backdrop-blur-sm text-black border-0 shadow-lg scale-90 group-hover:scale-100 transition-transform duration-300">
                        <View className="h-4 w-4 mr-2" /> View
                      </Button>
                    </div>
                    {photo.approval_status && photo.approval_status !== 'approved' && (
                      <div className="absolute top-3 left-3">
                        <Badge variant={photo.approval_status.includes('pending') ? 'secondary' : 'destructive'} className="rounded-full backdrop-blur-md bg-black/50 text-[10px] border-0 px-2 py-0.5">
                          {photo.approval_status.replace('pending-', 'Waiting: ')}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-bold text-sm truncate tracking-tight">{photo.description}</h4>
                      <div className="flex items-center text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 rounded-md border-border/50 bg-muted/30 mr-2">{getProjectName(photo.project_id)}</Badge>
                        <span>{new Date(photo.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 -mr-1">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl border-border/50">
                        <DropdownMenuItem onClick={() => setViewingPhoto(photo)} className="rounded-lg cursor-pointer">
                          <View className="mr-2 h-4 w-4" /> View Large
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditClick(photo)} className="rounded-lg cursor-pointer">
                          <Pencil className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <DropdownMenuItem
                          className="rounded-lg text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 cursor-pointer"
                          onClick={() => handleDeleteClick(photo.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Photo
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center py-20 border-dashed">
            <Camera className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Photos Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Get started by adding a site photo to a project.
            </p>
            <Button className="mt-6" onClick={handleAddClick}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Photo
            </Button>
          </Card>
        )}

        <Dialog open={isSheetOpen} onOpenChange={setSheetOpen}>
          <DialogContent className="w-full max-w-none sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPhoto ? 'Edit' : 'Add a New'} Site Photo</DialogTitle>
              <DialogDescription>{editingPhoto ? 'Update the details for this photo.' : 'Upload an image or use your camera to capture one for a project.'}</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <PhotoForm setOpen={setSheetOpen} photo={editingPhoto} />
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(undefined)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{viewingPhoto?.description}</DialogTitle>
              <DialogDescription>
                Project: {viewingPhoto ? getProjectName(viewingPhoto.project_id) : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <div className="relative aspect-video w-full">
                {viewingPhoto && <Image src={viewingPhoto.image_url} alt={viewingPhoto.description} fill className="object-contain rounded-md" />}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingPhotoId} onOpenChange={() => setDeletingPhotoId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                {currentUser?.role === 'admin' ? 'This will permanently delete this photo.' : 'This will submit a deletion request. If you\'d like, you can provide a message to the admin.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {currentUser?.role !== 'admin' && (
              <div className="py-4 space-y-2">
                <Label htmlFor="request_message">Message for Admin (Optional)</Label>
                <Textarea
                  id="request_message"
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="e.g. This photo is blurry."
                />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>
                {currentUser?.role === 'admin' ? 'Delete Photo' : 'Submit Deletion Request'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}


