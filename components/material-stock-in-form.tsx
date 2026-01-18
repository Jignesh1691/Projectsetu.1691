

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Paperclip, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from './ui/combobox';
import { addMaterialLedgerEntry, editMaterialLedgerEntry } from '@/lib/store';
import React, { useState, useEffect } from 'react';
import type { MaterialLedgerEntry } from '@/lib/definitions';
import { ScrollArea } from './ui/scroll-area';
import { DialogFooter } from './ui/dialog';
import { FormDescription } from './ui/form';

type FormValues = {
  quantity: number;
  description?: string;
  date: Date;
  project_id: string;
  material_id: string;
  challan_url?: string;
  request_message?: string;
};

const formSchema: z.ZodType<FormValues> = z.object({
  quantity: z.coerce.number().positive('Quantity must be greater than 0.').max(1000000, 'Quantity is too large.'),
  description: z.string().optional(),
  date: z.date().refine((d) => d <= new Date(Date.now() + 86400000), {
    message: "Date cannot be more than 1 day in the future",
  }),
  project_id: z.string().min(1, 'Please select a project.'),
  material_id: z.string().min(1, 'Please select a material.'),
  challan_url: z.string().optional(),
  request_message: z.string().optional(),
});

interface MaterialStockInFormProps {
  setOpen: (open: boolean) => void;
  entry?: MaterialLedgerEntry;
}

export function MaterialStockInForm({ setOpen, entry }: MaterialStockInFormProps) {
  const { materials, userVisibleProjects, currentUser, appUser } = useAppState();
  const { toast } = useToast();

  const [challanPreview, setChallanPreview] = useState<string | undefined>(entry?.challan_url);
  const [challanName, setChallanName] = useState<string | undefined>();

  const form = useForm<any>({
    resolver: zodResolver(formSchema as any) as any,
    defaultValues: entry ? {
      ...(entry.pending_data ? entry.pending_data as any : entry),
      date: new Date(entry.date),
      request_message: '',
    } : {
      date: new Date(),
      quantity: 0,
      description: '',
      project_id: '',
      material_id: '',
      challan_url: '',
      request_message: '',
    },
  });

  useEffect(() => {
    if (entry) {
      form.reset({
        ...(entry.pending_data ? entry.pending_data as any : entry),
        date: new Date(entry.date),
      });
      setChallanPreview(entry.challan_url);
    }
  }, [entry, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        form.setValue('challan_url', dataUrl);
        setChallanPreview(dataUrl);
        setChallanName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveChallan = () => {
    form.setValue('challan_url', undefined);
    setChallanPreview(undefined);
    setChallanName(undefined);
    const fileInput = document.getElementById('challan-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return;
    const material = materials.find(m => m.id === values.material_id);
    const data = {
      ...values,
      date: values.date.toISOString(),
      type: 'in' as const,
    };

    if (entry) {
      await editMaterialLedgerEntry(entry.id, data, currentUser, values.request_message);
      toast({
        title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
        description: currentUser.role === 'admin' ? 'Stock In entry has been updated.' : 'Your edit request has been submitted for approval.'
      });
    } else {
      await addMaterialLedgerEntry(data, currentUser, values.request_message);
      toast({
        title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
        description: currentUser.role === 'admin'
          ? `Logged stock in of ${values.quantity} ${material?.unit} of ${material?.name}.`
          : 'Your stock in entry has been submitted for approval.'
      });
    }

    form.reset();
    setOpen(false);
  }

  const isNonAdmin = appUser?.role?.toLowerCase() !== 'admin';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
        <ScrollArea className="flex-grow pr-6 -mr-6 max-h-[70vh]">
          <div className="space-y-3 px-1 pt-1 pb-2">
            <FormField
              control={form.control}
              name="material_id"
              render={({ field }) => (
                <FormItem className="flex flex-col space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Material</FormLabel>
                  <Combobox
                    options={materials.map(m => ({ value: m.id, label: `${m.name} (${m.unit})` }))}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select a material"
                    searchPlaceholder="Search materials..."
                    notFoundMessage="No materials found."
                    className="h-9 md:h-10"
                  />
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

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Quantity Received</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} className="h-9 md:h-10 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn('w-full pl-3 text-left font-normal h-9 md:h-10 rounded-xl text-sm', !field.value && 'text-muted-foreground')}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border/50" align="center">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormItem className="space-y-1">
              <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Upload Challan/Bill (Optional)</FormLabel>
              <FormControl>
                <Input id="challan-upload" type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="pt-1.5 h-9 md:h-10 rounded-xl text-xs" />
              </FormControl>
              {challanPreview && (
                <div className="mt-2 relative w-fit">
                  <a href={challanPreview} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    {challanName || 'View Attachment'}
                  </a>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 absolute -top-2 -right-6" onClick={handleRemoveChallan}>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
              <FormMessage />
            </FormItem>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., From supplier X, for foundation work" {...field} className="min-h-[60px] rounded-xl text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isNonAdmin && entry && (
              <FormField
                control={form.control}
                name="request_message"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Message for Admin</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Correction for quantity." {...field} className="min-h-[60px] rounded-xl text-sm" />
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
        <DialogFooter className="pt-3 flex-shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 md:h-12 rounded-xl flex-1 text-sm">Cancel</Button>
          <Button type="submit" className="h-10 md:h-12 rounded-xl flex-1 text-sm">{entry ? 'Update' : 'Add'} Stock In Entry</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
