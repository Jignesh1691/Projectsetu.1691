

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { Camera, Upload, XCircle, FlipHorizontal, Check, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox } from './ui/combobox';
import { addPhoto, editPhoto } from '@/lib/store';
import type { Photo } from '@/lib/definitions';
import { ScrollArea } from './ui/scroll-area';
import { DialogFooter } from './ui/dialog';

const formSchema = z.object({
  project_id: z.string().min(1, 'Please select a project.'),
  description: z.string().min(2, 'Description must be at least 2 characters.'),
  image_url: z.string().min(1, 'An image is required.'),
  request_message: z.string().optional(),
});

interface PhotoFormProps {
  setOpen: (open: boolean) => void;
  photo?: Photo;
}

export function PhotoForm({ setOpen, photo }: PhotoFormProps) {
  const { currentUser, userVisibleProjects, appUser } = useAppState();
  const { toast } = useToast();

  const [imagePreview, setImagePreview] = useState<string | null>(photo?.image_url || null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: photo ? {
      ...(photo.pending_data ? (photo.pending_data as any) : photo),
      request_message: '',
    } : {
      description: '',
      project_id: '',
      image_url: '',
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

  const getCameraPermission = useCallback(async (mode: 'user' | 'environment') => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Stop any existing stream before starting a new one
      stopCamera();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
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

  const handleToggleFacingMode = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    getCameraPermission(newMode);
  }


  const handleTabChange = (value: string) => {
    if (value === 'camera') {
      getCameraPermission(facingMode);
    } else {
      stopCamera();
    }
  };

  useEffect(() => {
    // Simple flash animation for camera capture.
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes flash {
        0% { opacity: 0.7; }
        100% { opacity: 0; }
      }
      .flash-animation {
        animation: flash 0.3s ease-out;
      }
    `;
    document.head.appendChild(style);

    return () => {
      stopCamera();
      document.head.removeChild(style);
    };
  }, [stopCamera]);

  // Helper to convert base64/dataURL to File
  const dataURLtoFile = (dataurl: string, filename: string) => {
    let arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)![1],
      bstr = atob(arr[arr.length - 1]),
      n = bstr.length,
      u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        form.setValue('image_url', dataUrl); // Still set for preview
        setImagePreview(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/png');

        const capturedFile = dataURLtoFile(dataUrl, `captured-${Date.now()}.png`);
        setSelectedFile(capturedFile);

        form.setValue('image_url', dataUrl);
        setImagePreview(dataUrl);
        stopCamera();
      }
    }
    setTimeout(() => setIsCapturing(false), 1000);
  };


  const handleRemoveImage = () => {
    form.setValue('image_url', '');
    setImagePreview(null);
    setSelectedFile(null);
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    // If we were using the camera, re-enable it
    const currentTab = document.querySelector('[data-state="active"]')?.getAttribute('data-value');
    if (currentTab === 'camera') {
      getCameraPermission(facingMode);
    }
  };

  const handleRetake = () => {
    handleRemoveImage();
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return;

    // Include the selected file in the data passed to the store
    const photoData = {
      ...values,
      file: selectedFile || undefined,
    } as any;

    if (photo) {
      await editPhoto(photo.id, photoData, currentUser, values.request_message);
      toast({
        title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
        description: currentUser.role === 'admin' ? 'Photo has been updated.' : 'Your edit request has been submitted for approval.',
      });
    } else {
      await addPhoto(photoData, currentUser, values.request_message);
      toast({
        title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
        description: currentUser.role === 'admin'
          ? 'New photo has been added to the gallery.'
          : 'Your new photo has been submitted for approval.',
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
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Image</FormLabel>
                    <FormControl>
                      <Tabs defaultValue="upload" className="w-full" onValueChange={handleTabChange}>
                        {!photo && (
                          <TabsList className="grid w-full grid-cols-2 h-9">
                            <TabsTrigger value="upload" className="text-xs"><Upload className="mr-2 h-3 w-3" /> Upload File</TabsTrigger>
                            <TabsTrigger value="camera" className="text-xs"><Camera className="mr-2 h-3 w-3" /> Use Camera</TabsTrigger>
                          </TabsList>
                        )}
                        <TabsContent value="upload">
                          <Card>
                            <CardContent className="p-3 space-y-3">
                              {imagePreview ? (
                                <div className="relative aspect-video w-full">
                                  <img src={imagePreview} alt="Preview" className="rounded-md object-cover w-full h-full" />
                                  {!photo && (
                                    <Button type="button" variant="destructive" size="icon" className="h-6 w-6 absolute top-2 right-2" onClick={handleRemoveImage}>
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <Input id="photo-upload" type="file" accept="image/*" onChange={handleFileChange} className="pt-1.5 h-9 md:h-10 text-xs" />
                                  <FormMessage />
                                </>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>
                        <TabsContent value="camera">
                          <Card>
                            <CardContent className="p-3 space-y-3">
                              {imagePreview && !photo ? (
                                <div className="relative aspect-video w-full">
                                  <img src={imagePreview} alt="Captured" className="rounded-md object-cover w-full h-full" />
                                  <Button type="button" variant="outline" size="sm" className="absolute bottom-2 left-2 bg-black/50 text-white hover:bg-black/70 text-xs h-8" onClick={handleRetake}>
                                    <FlipHorizontal className="mr-2 h-3 w-3" /> Retake
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden flex items-center justify-center">
                                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                    <canvas ref={canvasRef} className="hidden" />
                                    {isCapturing && <div className="absolute inset-0 bg-white flash-animation"></div>}
                                    {hasCameraPermission === false && (
                                      <div className="text-center p-4">
                                        <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-muted-foreground text-xs">Camera access is required.</p>
                                      </div>
                                    )}
                                  </div>

                                  {hasCameraPermission === true ? (
                                    <div className="flex items-center gap-2">
                                      <Button type="button" onClick={handleCapture} disabled={isCapturing} className="w-full h-9 text-xs">
                                        {isCapturing ? <Check className="mr-2 h-3 w-3 animate-pulse" /> : <Camera className="mr-2 h-3 w-3" />}
                                        {isCapturing ? 'Captured!' : 'Capture Photo'}
                                      </Button>
                                      <Button type="button" variant="outline" size="icon" onClick={handleToggleFacingMode} title="Switch Camera" className="h-9 w-9">
                                        <RefreshCw className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Alert variant="destructive" className="p-2">
                                      <AlertTitle className="text-xs font-bold">Camera Access Required</AlertTitle>
                                      <AlertDescription className="text-xs">
                                        Please allow camera access.
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </Tabs>
                    </FormControl>
                    {photo && <FormMessage>The photo cannot be changed after creation.</FormMessage>}
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
                      notFoundMessage="No project found."
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
                      <Textarea placeholder="e.g., Initial site survey" {...field} className="min-h-[50px] rounded-xl text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isNonAdmin && (
                <FormField
                  control={form.control}
                  name="request_message"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Message for Admin</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Updated the description to be more accurate." {...field} className="min-h-[50px] rounded-xl text-sm" />
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
            <Button type="submit" className="h-10 md:h-12 rounded-xl flex-1 text-sm">{photo ? 'Update' : 'Add'} Photo</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

