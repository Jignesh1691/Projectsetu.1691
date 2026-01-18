

'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, XCircle, Upload, Camera, Trash2, FileCheck2, RefreshCw } from 'lucide-react';
import { Combobox } from './ui/combobox';
import { addAppDocument, editAppDocument } from '@/lib/store';
import type { Document as AppDocument } from '@/lib/definitions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import jsPDF from 'jspdf';
import { DialogFooter } from './ui/dialog';


const formSchema = z.object({
  project_id: z.string().min(1, 'Please select a project.'),
  description: z.string().min(2, 'Description must be at least 2 characters.'),
  document_url: z.string().min(1, 'A initialDoc is required.'),
  document_name: z.string().min(1, 'Document name is required'),
  request_message: z.string().optional(),
});

interface DocumentFormProps {
  setOpen: (open: boolean) => void;
  initialDoc?: AppDocument;
}

export function DocumentForm({ setOpen, initialDoc }: DocumentFormProps) {
  const { currentUser, userVisibleProjects, appUser } = useAppState();
  const { toast } = useToast();

  const [documentName, setDocumentName] = useState<string | null>(initialDoc?.document_name || null);
  const [scannedPages, setScannedPages] = useState<string[]>([]);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Camera state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialDoc ? {
      ...(initialDoc.pending_data ? (initialDoc.pending_data as any) : initialDoc),
      request_message: '',
    } : {
      description: '',
      project_id: '',
      document_url: '',
      document_name: '',
      request_message: '',
    },
  });

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const getCameraPermission = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      stopCamera();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        if ((error as Error).name === "NotAllowedError") {
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use this feature.',
          });
        }
      }
    } else {
      setHasCameraPermission(false);
    }
  }, [stopCamera, toast]);

  const handleTabChange = (value: string) => {
    if (value === 'scan') {
      getCameraPermission();
    } else {
      stopCamera();
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        form.setValue('document_url', dataUrl);
        form.setValue('document_name', file.name);
        setDocumentName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveDocument = () => {
    form.setValue('document_url', '');
    form.setValue('document_name', '');
    setDocumentName(null);
    setScannedPages([]);
    setSelectedFile(null);
    const fileInput = document.getElementById('document-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleScanPage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setScannedPages(prev => [...prev, dataUrl]);
      }
    }
  };

  const handleRemovePage = (index: number) => {
    setScannedPages(prev => prev.filter((_, i) => i !== index));
  };

  const generatePdf = async () => {
    if (scannedPages.length === 0) return;
    setIsProcessingPdf(true);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < scannedPages.length; i++) {
      const imgData = scannedPages[i];
      if (i > 0) {
        pdf.addPage();
      }

      const img = new Image();
      img.src = imgData;
      await new Promise(resolve => img.onload = resolve);

      const imgWidth = img.width;
      const imgHeight = img.height;
      const ratio = imgWidth / imgHeight;

      let finalWidth = pdfWidth;
      let finalHeight = pdfWidth / ratio;

      if (finalHeight > pdfHeight) {
        finalHeight = pdfHeight;
        finalWidth = pdfHeight * ratio;
      }

      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
    }

    const pdfName = `scan_${new Date().toISOString().split('T')[0]}.pdf`;
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], pdfName, { type: 'application/pdf' });

    setSelectedFile(pdfFile);
    form.setValue('document_url', pdf.output('datauristring')); // for preview compat
    form.setValue('document_name', pdfName);
    setDocumentName(pdfName);

    setIsProcessingPdf(false);
    toast({
      title: "PDF Generated",
      description: `${scannedPages.length} pages have been compiled into a single PDF.`,
    });
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return;

    const docData = {
      ...values,
      file: selectedFile || undefined,
    } as any;

    if (initialDoc) {
      await editAppDocument(initialDoc.id, docData, currentUser, values.request_message);
      toast({
        title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
        description: currentUser.role === 'admin' ? 'Document has been updated.' : 'Your edit request has been submitted for approval.',
      });
    } else {
      await addAppDocument(docData, currentUser, values.request_message);
      toast({
        title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
        description: currentUser.role === 'admin' ? 'New initialDoc has been added.' : 'Your new initialDoc has been submitted for approval.',
      });
    }

    form.reset();
    setSelectedFile(null);
    setOpen(false);
  }

  const isNonAdmin = appUser?.role?.toLowerCase() !== 'admin';

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
          <ScrollArea className="flex-grow pr-6 -mr-6 max-h-[70vh]">
            <div className="space-y-3 px-1 pt-1 pb-2">
              <Tabs defaultValue="upload" className="w-full" onValueChange={handleTabChange}>
                {!initialDoc && (
                  <TabsList className="grid w-full grid-cols-2 h-9">
                    <TabsTrigger value="upload" disabled={!!documentName} className="text-xs"><Upload className="mr-2 h-3 w-3" /> Upload File</TabsTrigger>
                    <TabsTrigger value="scan" disabled={!!documentName} className="text-xs"><Camera className="mr-2 h-3 w-3" /> Scan Document</TabsTrigger>
                  </TabsList>
                )}
                <TabsContent value="upload">
                  <Card>
                    <CardContent className="p-3 space-y-3">
                      {documentName ? (
                        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground p-2 bg-muted rounded-md">
                          <div className="flex items-center gap-2 truncate">
                            <FileCheck2 className="h-4 w-4 text-green-600" />
                            <span className="truncate text-xs">{documentName}</span>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive flex-shrink-0" onClick={handleRemoveDocument}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Input id="document-upload" type="file" onChange={handleFileChange} className="pt-1.5 h-9 md:h-10 text-xs" />
                      )}
                      {initialDoc && <FormMessage>The document file cannot be changed after creation.</FormMessage>}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="scan">
                  <Card>
                    <CardContent className="p-3 space-y-3">
                      {documentName ? (
                        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground p-2 bg-muted rounded-md">
                          <div className="flex items-center gap-2 truncate">
                            <FileCheck2 className="h-4 w-4 text-green-600" />
                            <span className="truncate text-xs">{documentName}</span>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive flex-shrink-0" onClick={handleRemoveDocument}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden flex items-center justify-center">
                            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                            <canvas ref={canvasRef} className="hidden" />
                            {hasCameraPermission === false && (
                              <div className="text-center p-4">
                                <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-muted-foreground text-xs">Camera access is required.</p>
                              </div>
                            )}
                          </div>
                          {hasCameraPermission === true ? (
                            <Button type="button" onClick={handleScanPage} className="w-full h-9 text-xs">
                              <Camera className="mr-2 h-3 w-3" /> Scan Page {scannedPages.length > 0 && `(${scannedPages.length + 1})`}
                            </Button>
                          ) : (
                            <Button type="button" onClick={getCameraPermission} className="w-full h-9 text-xs">
                              <RefreshCw className="mr-2 h-3 w-3" /> Retry Camera
                            </Button>
                          )}

                          {scannedPages.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="font-medium text-xs">Scanned Pages ({scannedPages.length})</h4>
                              <ScrollArea className="h-24">
                                <div className="grid grid-cols-3 gap-2 pr-2">
                                  {scannedPages.map((page, index) => (
                                    <div key={index} className="relative aspect-square">
                                      <img src={page} alt={`Page ${index + 1}`} className="object-cover w-full h-full rounded-md" />
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="h-5 w-5 absolute top-1 right-1"
                                        onClick={() => handleRemovePage(index)}
                                      >
                                        <XCircle className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                              <Button
                                type="button"
                                onClick={generatePdf}
                                className="w-full h-9 text-xs"
                                disabled={isProcessingPdf}
                              >
                                {isProcessingPdf ? "Generating PDF..." : "Create PDF from Scans"}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <FormField
                control={form.control}
                name="document_url"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormLabel>Document URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Project</FormLabel>
                    <Combobox
                      options={userVisibleProjects.map(p => ({ value: p.id, label: p.name }))}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select a project"
                      searchPlaceholder="Search projects..."
                      notFoundMessage="No projects found."
                      className="h-9 md:h-10"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Final blueprints" {...field} className="min-h-[50px] rounded-xl text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isNonAdmin && initialDoc && (
                <FormField
                  control={form.control}
                  name="request_message"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Message for Admin</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Please update the description for this initialDoc." {...field} className="min-h-[50px] rounded-xl text-sm" />
                      </FormControl>
                      <FormDescription className="text-[10px]">
                        Provide a brief reason for this change for the admin to review.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="flex-shrink-0 pt-3 gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 md:h-12 rounded-xl flex-1 text-sm">
              Cancel
            </Button>
            <Button type="submit" className="h-10 md:h-12 rounded-xl flex-1 text-sm">{initialDoc ? 'Update' : 'Add'} Document</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

