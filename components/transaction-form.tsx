

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
import { CalendarIcon, Paperclip, XCircle, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import type { Transaction, Project, Ledger } from '@/lib/definitions';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { ProjectForm } from './project-form';
import { LedgerForm } from './ledger-form';
import { Combobox } from './ui/combobox';
import { Label } from '@/components/ui/label';
import { addTransaction, editTransaction, revertConvertedTransaction } from '@/lib/store';
import { ScrollArea } from './ui/scroll-area';

const formSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.').max(100000000, 'Amount seems too high. Please verify.'),
  description: z.string().min(2, 'Description must be at least 2 characters.'),
  date: z.date().refine((d) => d <= new Date(Date.now() + 86400000), {
    message: "Date cannot be more than 1 day in the future",
  }),
  project_id: z.string().min(1, 'Please select a project.'),
  ledger_id: z.string().min(1, 'Please select a ledger.'),
  payment_mode: z.enum(['cash', 'bank']),
  bill_url: z.string().optional(),
  request_message: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TransactionFormProps {
  setOpen: (open: boolean) => void;
  transaction?: Transaction;
}

const CREATE_NEW_VALUE = 'create-new';

export function TransactionForm({ setOpen, transaction }: TransactionFormProps) {
  const { ledgers, currentUser, userEntryAllowedProjects, appUser } = useAppState();
  const { toast } = useToast();

  const [isProjectDialogOpen, setProjectDialogOpen] = useState(false);
  const [isLedgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [billPreview, setBillPreview] = useState<string | undefined>(transaction?.bill_url);
  const [billName, setBillName] = useState<string | undefined>();
  const [isScanning, setIsScanning] = useState(false);
  const [billBlob, setBillBlob] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: transaction ? {
      ...(transaction.pending_data ? transaction.pending_data as any : transaction),
      date: transaction.date ? new Date(transaction.date) : new Date(),
      request_message: transaction.request_message || '',
    } as any : {
      description: '',
      amount: 0,
      type: 'expense',
      date: new Date(),
      project_id: '',
      ledger_id: '',
      payment_mode: 'bank',
      request_message: '',
    },
  });

  useEffect(() => {
    if (transaction?.bill_url) {
      setBillPreview(transaction.bill_url);
      setBillName('Previously uploaded file');
    }
  }, [transaction]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBillBlob(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setBillPreview(base64String);
        form.setValue('bill_url', base64String);
      };
      reader.readAsDataURL(file);
      setBillName(file.name);
    }
  };

  const handleScanBill = async () => {
    if (!billPreview) return;
    setIsScanning(true);
    try {
      const response = await fetch('/api/ai/process-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: billPreview }),
      });

      if (!response.ok) throw new Error("AI scanning failed");
      const data = await response.json();

      if (data.amount) form.setValue('amount', data.amount);
      if (data.description) form.setValue('description', data.description);
      if (data.date) {
        try {
          form.setValue('date', new Date(data.date));
        } catch (e) {
          console.error("Invalid date from AI:", data.date);
        }
      }

      // Categorize if possible
      if (data.category) {
        const matchedLedger = ledgers.find(l =>
          l.name.toLowerCase().includes(data.category.toLowerCase()) ||
          data.category.toLowerCase().includes(l.name.toLowerCase())
        );
        if (matchedLedger) {
          form.setValue('ledger_id', matchedLedger.id);
        }
      }

      toast({
        title: "Bill Scanned",
        description: "I've extracted the amount, date, and description for you.",
      });
    } catch (error) {
      console.error("AI Error:", error);
      toast({
        title: "Scan Failed",
        description: "I couldn't process this bill. Please enter details manually.",
        variant: "destructive"
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleRemoveBill = () => {
    form.setValue('bill_url', undefined);
    setBillPreview(undefined);
    setBillName(undefined);
    const fileInput = document.getElementById('bill-upload') as HTMLInputElement;
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
  }

  const handleNewLedger = (newLedger: Ledger) => {
    form.setValue('ledger_id', newLedger.id);
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return;

    const data = {
      ...values,
      date: values.date.toISOString(),
    };

    try {
      if (transaction) {
        await editTransaction(transaction.id, data, currentUser, values.request_message);
        toast({
          title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
          description: currentUser.role === 'admin' ? 'Transaction has been updated.' : 'Your edit request has been submitted for approval.',
        });
      } else {
        await addTransaction(data, currentUser, values.request_message);
        toast({
          title: 'Transaction Added',
          description: 'Your new transaction has been recorded.',
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

  const isNonAdmin = appUser?.role !== 'admin';

  if (transaction?.converted_from_record_id) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
          <p className="text-sm font-medium">This transaction was converted from a record.</p>
          <p className="text-sm mt-1">You cannot edit it directly. To make changes, please revert it to outstanding status first.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 opacity-60 pointer-events-none">
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="p-2 border rounded-md">{transaction.type}</div>
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="p-2 border rounded-md">{transaction.amount}</div>
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Description</Label>
            <div className="p-2 border rounded-md">{transaction.description}</div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button
            variant="destructive"
            onClick={async () => {
              if (!currentUser) return;
              try {
                await revertConvertedTransaction(transaction);
                toast({ title: "Success", description: "Transaction reverted to outstanding record." });
                setOpen(false);
              } catch (e) {
                toast({ variant: "destructive", title: "Error", description: "Failed to revert transaction." });
              }
            }}
          >
            Revert to Outstanding
          </Button>
        </div>
      </div>
    );
  }

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
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
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
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Date</FormLabel>
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
                            userEntryAllowedProjects.map(p => ({ value: p.id, label: p.name }))
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
                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Attach Receipt/Bill (Optional)</FormLabel>
                <FormControl>
                  <Input id="bill-upload" type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="pt-1.5 h-9 md:h-10 rounded-xl text-xs" />
                </FormControl>
                {billPreview && (
                  <div className="mt-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <a href={billPreview} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        {billName || 'View Attachment'}
                      </a>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemoveBill}>
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center gap-2 border-primary/20 hover:border-primary/50 text-xs py-1 h-8"
                      onClick={handleScanBill}
                      disabled={isScanning}
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          Scan & Autofill with AI
                        </>
                      )}
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
                      <Textarea placeholder="e.g. Rebar purchase" {...field} className="min-h-[50px] rounded-xl text-sm" rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isNonAdmin && transaction && (
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 md:h-12 rounded-xl flex-1 text-sm">Cancel</Button>
            <Button type="submit" className="h-10 md:h-12 rounded-xl flex-1 text-sm">{transaction ? 'Update' : 'Add'} Transaction</Button>
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

