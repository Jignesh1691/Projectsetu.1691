

'use client';

import { useForm, Resolver } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppState } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Paperclip, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import type { Recordable, Project, Ledger } from '@/lib/definitions';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { ProjectForm } from './project-form';
import { LedgerForm } from './ledger-form';
import { Combobox } from './ui/combobox';
import { addRecordable, editRecordable } from '@/lib/store';
import { ScrollArea } from './ui/scroll-area';

const formSchema = z.object({
  type: z.enum(['asset', 'liability']),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  description: z.string().min(2, 'Description must be at least 2 characters.'),
  due_date: z.date(),
  project_id: z.string().min(1, 'Please select a project.'),
  ledger_id: z.string().min(1, 'Please select a ledger.'),
  payment_mode: z.enum(['cash', 'bank']),
  bill_url: z.string().optional(),
  request_message: z.string().optional(),
});

interface RecordFormProps {
  setOpen: (open: boolean) => void;
  record?: Recordable;
}

const CREATE_NEW_VALUE = 'create-new';

type FormValues = z.infer<typeof formSchema>;

export function RecordForm({ setOpen, record }: RecordFormProps) {
  const { ledgers, currentUser, userVisibleProjects, appUser } = useAppState();
  const { toast } = useToast();

  const [isProjectDialogOpen, setProjectDialogOpen] = useState(false);
  const [isLedgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [billPreview, setBillPreview] = useState<string | undefined>(record?.bill_url);
  const [billName, setBillName] = useState<string | undefined>();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: record
      ? {
        ...(record.pending_data ? record.pending_data as any : record),
        due_date: new Date(record.due_date),
        request_message: '',
      }
      : {
        description: '',
        amount: 0,
        type: 'asset',
        due_date: new Date(),
        payment_mode: 'bank',
        request_message: '',
      },
  });

  useEffect(() => {
    if (record?.bill_url) {
      setBillPreview(record.bill_url);
      setBillName('Previously uploaded file');
    }
  }, [record]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        form.setValue('bill_url', dataUrl);
        setBillPreview(dataUrl);
        setBillName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBill = () => {
    form.setValue('bill_url', undefined);
    setBillPreview(undefined);
    setBillName(undefined);
    const fileInput = document.getElementById('bill-upload-record') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleProjectSelect = (value: string) => {
    if (value === CREATE_NEW_VALUE) {
      setProjectDialogOpen(true);
    } else {
      form.setValue('project_id', value);
    }
  };

  const handleLedgerSelect = (value: string) => {
    if (value === CREATE_NEW_VALUE) {
      setLedgerDialogOpen(true);
    } else {
      form.setValue('ledger_id', value);
    }
  };

  const handleNewProject = (newProject: Project) => {
    form.setValue('project_id', newProject.id);
  };

  const handleNewLedger = (newLedger: Ledger) => {
    form.setValue('ledger_id', newLedger.id);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return;

    const data = {
      ...values,
      due_date: values.due_date.toISOString(),
    };

    try {
      if (record) {
        await editRecordable(record.id, data, currentUser, values.request_message);
        toast({
          title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
          description: currentUser.role === 'admin' ? 'Record has been updated.' : 'Your edit request has been submitted for approval.',
        });
      } else {
        const newRecord = {
          ...data,
          status: 'pending' as 'pending',
        };
        await addRecordable(newRecord, currentUser, values.request_message);
        toast({
          title: 'Record Added',
          description: 'Your new record has been created.',
        });
      }

      form.reset();
      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    }
  }

  const isNonAdmin = appUser?.role?.toLowerCase() !== 'admin';

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
          <ScrollArea className="flex-grow pr-6 -mr-6 max-h-[70vh]">
            <div className="space-y-3 px-1 pt-1 pb-2">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 md:h-10 rounded-xl text-sm">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="asset">Receivable</SelectItem>
                          <SelectItem value="liability">Payable</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="payment_mode"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Mode</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 md:h-10 rounded-xl text-sm">
                            <SelectValue placeholder="Mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bank">Bank</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Amount</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0.00" {...field} className="h-9 md:h-10 rounded-xl font-bold text-sm" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn(
                                'w-full h-9 md:h-10 px-3 text-left font-normal rounded-xl text-sm',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? format(field.value, 'dd/MM/yy') : <span>Pick</span>}
                              <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border/50" align="center">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3 border p-3 rounded-xl bg-card/50 shadow-sm border-border/50">
                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Project</FormLabel>
                      <Combobox
                        options={
                          (appUser?.role === 'admin' ? [{ value: CREATE_NEW_VALUE, label: 'Create new project...' }] : []).concat(
                            userVisibleProjects.map(p => ({ value: p.id, label: p.name }))
                          )
                        }
                        value={field.value}
                        onChange={handleProjectSelect}
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
                  name="ledger_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Ledger / Cost Code</FormLabel>
                      <Combobox
                        options={
                          [
                            ...ledgers.map(l => ({ value: l.id, label: l.name })),
                            { value: CREATE_NEW_VALUE, label: 'Create new ledger...' }
                          ]
                        }
                        value={field.value}
                        onChange={handleLedgerSelect}
                        placeholder="Select a ledger"
                        searchPlaceholder="Search ledgers..."
                        notFoundMessage="No ledger found."
                        className="h-9 md:h-10"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormItem className="space-y-1">
                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Attach Invoice/Bill (Optional)</FormLabel>
                <FormControl>
                  <Input id="bill-upload-record" type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="pt-1.5 h-9 md:h-10 rounded-xl text-xs" />
                </FormControl>
                {billPreview && (
                  <div className="mt-2 relative w-fit">
                    <a href={billPreview} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      {billName || 'View Attachment'}
                    </a>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 absolute -top-2 -right-6" onClick={handleRemoveBill}>
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
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g. Subcontractor invoice" {...field} className="min-h-[50px] rounded-xl text-sm" rows={2} />
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
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Message for Admin (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Reason for change..." {...field} className="min-h-[50px] rounded-xl text-sm" rows={2} />
                      </FormControl>
                      <FormDescription className="text-[10px]">
                        Reason for this change for review.
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
            <Button type="submit" className="h-10 md:h-12 rounded-xl flex-1 text-sm">{record ? 'Update' : 'Add'} Record</Button>
          </DialogFooter>
        </form>
      </Form>

      <Dialog open={isProjectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Project</DialogTitle>
            <DialogDescription>
              Add a new construction project to start tracking it.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ProjectForm setOpen={setProjectDialogOpen} onProjectCreated={handleNewProject} />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isLedgerDialogOpen} onOpenChange={setLedgerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Ledger</DialogTitle>
            <DialogDescription>
              Ledgers help you categorize job costs (e.g., Labor, Materials).
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <LedgerForm setOpen={setLedgerDialogOpen} onLedgerCreated={handleNewLedger} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

