

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
import { CalendarIcon, Paperclip, XCircle, Wand2 } from 'lucide-react';
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
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  description: z.string().min(2, 'Description must be at least 2 characters.'),
  due_date: z.date(),
  project_id: z.string().min(1, 'Please select a project.'),
  ledger_id: z.string().min(1, 'Please select a ledger.'),
  payment_mode: z.enum(['cash', 'bank']),
  bill_url: z.string().optional(),
  financial_account_id: z.string().optional(),
  request_message: z.string().optional(),

  // GST Fields
  is_gst_invoice: z.boolean().default(false),
  invoice_number: z.string().optional(),
  invoice_date: z.date().optional(),
  taxable_amount: z.coerce.number().optional(),
  cgst_rate: z.coerce.number().optional().default(0),
  cgst_amount: z.coerce.number().optional().default(0),
  sgst_rate: z.coerce.number().optional().default(0),
  sgst_amount: z.coerce.number().optional().default(0),
  igst_rate: z.coerce.number().optional().default(0),
  igst_amount: z.coerce.number().optional().default(0),
  cess_amount: z.coerce.number().optional().default(0),
  total_gst_amount: z.coerce.number().optional().default(0),
  round_off_amount: z.coerce.number().optional().default(0),
});

interface RecordFormProps {
  setOpen: (open: boolean) => void;
  record?: Recordable;
}

const CREATE_NEW_VALUE = 'create-new';

type FormValues = z.infer<typeof formSchema>;

export function RecordForm({ setOpen, record }: RecordFormProps) {
  const { ledgers, currentUser, userVisibleProjects, appUser, financial_accounts } = useAppState();
  const { toast } = useToast();

  const [isLedgerDialogOpen, setLedgerDialogOpen] = useState(false);
  const [billPreview, setBillPreview] = useState<string | undefined>(record?.bill_url);
  const [billName, setBillName] = useState<string | undefined>();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: record
      ? {
        ...(record.pending_data ? record.pending_data as any : record),
        type: record.type === 'income' || (record as any).type === 'income' ? 'income' : 'expense',
        due_date: new Date(record.due_date),
        invoice_date: record.invoice_date ? new Date(record.invoice_date) : undefined,
        is_gst_invoice: !!record.invoice_number,
        request_message: '',
        financial_account_id: record.financial_account_id || '',
      } as any
      : {
        description: '',
        amount: 0,
        type: 'income',
        due_date: new Date(),
        payment_mode: 'bank',
        request_message: '',
        financial_account_id: '',
        is_gst_invoice: false,
        cgst_rate: 0,
        sgst_rate: 0,
        igst_rate: 0,
        cess_amount: 0,
        round_off_amount: 0,
      },
  });

  const paymentMode = form.watch('payment_mode');
  const isGstInvoice = form.watch('is_gst_invoice');
  const taxableAmount = form.watch('taxable_amount');
  const cgstRate = form.watch('cgst_rate') || 0;
  const sgstRate = form.watch('sgst_rate') || 0;
  const igstRate = form.watch('igst_rate') || 0;
  const cessAmount = form.watch('cess_amount') || 0;
  const roundOffAmount = form.watch('round_off_amount') || 0;

  // Auto-calculate GST amounts and total
  useEffect(() => {
    const isGst = form.getValues('is_gst_invoice');
    const taxable = Number(form.getValues('taxable_amount')) || 0;
    const cgstR = Number(form.getValues('cgst_rate')) || 0;
    const sgstR = Number(form.getValues('sgst_rate')) || 0;
    const igstR = Number(form.getValues('igst_rate')) || 0;
    const cess = Number(form.getValues('cess_amount')) || 0;
    const roundOff = Number(form.getValues('round_off_amount')) || 0;

    if (isGst && taxable) {
      const cgst = (taxable * cgstR) / 100;
      const sgst = (taxable * sgstR) / 100;
      const igst = (taxable * igstR) / 100;
      const totalGst = cgst + sgst + igst + cess;
      const total = taxable + totalGst + roundOff;

      form.setValue('cgst_amount', parseFloat(cgst.toFixed(2)));
      form.setValue('sgst_amount', parseFloat(sgst.toFixed(2)));
      form.setValue('igst_amount', parseFloat(igst.toFixed(2)));
      form.setValue('total_gst_amount', parseFloat(totalGst.toFixed(2)));
      form.setValue('amount', parseFloat(total.toFixed(2)));
    } else if (!isGst) {
      // For non-GST, amount is taxable_amount + round_off
      const base = Number(form.getValues('amount')) || taxable || 0;
      const total = base + roundOff;
      // We don't want to overwrite 'amount' if user entered it directly for non-gst
      // unless they are using taxable_amount field
      if (taxable) {
        form.setValue('amount', parseFloat((taxable + roundOff).toFixed(2)));
      }
    }
  }, [isGstInvoice, taxableAmount, cgstRate, sgstRate, igstRate, cessAmount, roundOffAmount, form]);

  useEffect(() => {
    // Default ledger to 'Round Off' if found and not set
    if (!record && !form.getValues('ledger_id') && ledgers.length > 0) {
      const roundOffLedger = ledgers.find(l =>
        l.name?.toLowerCase().replace(/\s+/g, '') === 'roundoff' ||
        l.name?.toLowerCase().includes('round off')
      );
      if (roundOffLedger) {
        form.setValue('ledger_id', roundOffLedger.id);
      }
    }
  }, [ledgers, record, form]);

  useEffect(() => {
    // Auto-select default account if available and none selected
    if (!form.getValues('financial_account_id') && financial_accounts.length > 0) {
      const mode = form.getValues('payment_mode');
      const accounts = financial_accounts.filter(a => a.type === (mode === 'cash' ? 'CASH' : 'BANK'));
      if (accounts.length > 0) {
        const defaultAcc = accounts.find(a => a.name?.toLowerCase().includes('default')) || accounts[0];
        form.setValue('financial_account_id', defaultAcc.id);
      }
    }
  }, [financial_accounts, form]);

  // When payment mode changes, reset account selection or pick a default
  useEffect(() => {
    const currentAccId = form.getValues('financial_account_id');
    const mode = paymentMode;
    const accounts = financial_accounts.filter(a => a.type === (mode === 'cash' ? 'CASH' : 'BANK'));

    const currentAcc = financial_accounts.find(a => a.id === currentAccId);

    if (currentAcc && currentAcc.type !== (mode === 'cash' ? 'CASH' : 'BANK')) {
      const defaultAcc = accounts.find(a => a.name?.toLowerCase().includes('default')) || accounts[0];
      form.setValue('financial_account_id', defaultAcc ? defaultAcc.id : '');
    } else if (!currentAccId && accounts.length > 0) {
      const defaultAcc = accounts.find(a => a.name?.toLowerCase().includes('default')) || accounts[0];
      form.setValue('financial_account_id', defaultAcc.id);
    }
  }, [paymentMode, financial_accounts, form]);

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


  const handleLedgerSelect = (value: string) => {
    if (value === CREATE_NEW_VALUE) {
      setLedgerDialogOpen(true);
    } else {
      form.setValue('ledger_id', value);
    }
  };


  const handleNewLedger = (newLedger: Ledger) => {
    form.setValue('ledger_id', newLedger.id);
  };

  const handleAutoRound = () => {
    const isGst = form.getValues('is_gst_invoice');
    const taxable = Number(form.getValues('taxable_amount')) || 0;
    const cgstA = Number(form.getValues('cgst_amount')) || 0;
    const sgstA = Number(form.getValues('sgst_amount')) || 0;
    const igstA = Number(form.getValues('igst_amount')) || 0;
    const cess = Number(form.getValues('cess_amount')) || 0;

    let currentTotal = 0;
    if (isGst) {
      currentTotal = taxable + cgstA + sgstA + igstA + cess;
    } else {
      currentTotal = Number(form.getValues('amount')) || taxable || 0;
      // If we are adjusting current total to be round, we need the raw total before previous round_off
      currentTotal = currentTotal - (Number(form.getValues('round_off_amount')) || 0);
    }

    const roundedTotal = Math.round(currentTotal);
    const diff = parseFloat((roundedTotal - currentTotal).toFixed(2));
    form.setValue('round_off_amount', diff);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return;

    const data: any = {
      ...values,
      due_date: values.due_date.toISOString(),
      financial_account_id: values.financial_account_id || undefined,
      invoice_date: values.invoice_date?.toISOString(),
    };

    // If GST is disabled, clear GST fields
    if (!values.is_gst_invoice) {
      data.invoice_number = undefined;
      data.invoice_date = undefined;
      data.taxable_amount = undefined;
      data.cgst_amount = 0;
      data.sgst_amount = 0;
      data.igst_amount = 0;
      data.cess_amount = 0;
      data.total_gst_amount = 0;
      data.round_off_amount = 0;
    }

    try {
      if (record) {
        await editRecordable(record.id, data, currentUser, values.request_message);
        toast({
          title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
          description: currentUser.role === 'admin' ? 'Record has been updated.' : 'Your edit request has been submitted for approval.',
        });
      } else {
        await addRecordable(data, currentUser, values.request_message);
        toast({
          title: 'Record Added',
          description: 'Your new record has been created.',
        });
      }

      form.reset();
      setOpen(false);
    } catch (error: any) {
      console.error('Error submitting record:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Something went wrong. Please try again.",
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
                          <SelectItem value="income">Receivable (Income)</SelectItem>
                          <SelectItem value="expense">Payable (Expense)</SelectItem>
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

              <FormField
                control={form.control}
                name="financial_account_id"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">
                      {paymentMode === 'cash' ? 'Cash Account' : 'Bank Account'}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 md:h-10 rounded-xl text-sm">
                          <SelectValue placeholder="Select Account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {financial_accounts
                          .filter(a => a.type === (paymentMode === 'cash' ? 'CASH' : 'BANK'))
                          .map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} {account.accountNumber ? `(${account.accountNumber.slice(-4)})` : ''}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                        options={userVisibleProjects.map(p => ({ value: p.id, label: p.name }))}
                        value={field.value}
                        onChange={(value) => form.setValue('project_id', value)}
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

              <div className="space-y-4 border p-4 rounded-xl bg-primary/5 shadow-sm border-primary/20">
                <FormField
                  control={form.control}
                  name="is_gst_invoice"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-background">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-bold uppercase">GST Invoice</FormLabel>
                        <FormDescription className="text-[10px]">Enable for detailed GST tax calculation</FormDescription>
                      </div>
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {isGstInvoice && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="invoice_number"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Invoice No.</FormLabel>
                            <FormControl>
                              <Input
                                placeholder={form.watch('type') === 'income' ? 'Auto-generated' : 'INV-001'}
                                {...field}
                                className="h-9 md:h-10 rounded-xl text-sm"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="invoice_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col space-y-1">
                            <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Invoice Date</FormLabel>
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

                    <FormField
                      control={form.control}
                      name="taxable_amount"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Taxable Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              {...field}
                              className="h-9 md:h-10 rounded-xl font-bold text-sm bg-primary/5"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name="cgst_rate"
                        render={({ field }) => (
                          <FormItem className="space-y-0.5">
                            <FormLabel className="text-[10px] uppercase text-muted-foreground/70">CGST %</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="h-8 rounded-lg text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sgst_rate"
                        render={({ field }) => (
                          <FormItem className="space-y-0.5">
                            <FormLabel className="text-[10px] uppercase text-muted-foreground/70">SGST %</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="h-8 rounded-lg text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="igst_rate"
                        render={({ field }) => (
                          <FormItem className="space-y-0.5">
                            <FormLabel className="text-[10px] uppercase text-muted-foreground/70">IGST %</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} className="h-8 rounded-lg text-xs" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                  </div>
                )}

                <div className="pt-2">
                  <FormField
                    control={form.control}
                    name="round_off_amount"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <FormLabel className="text-[10px] uppercase text-muted-foreground/70">Round Off</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 text-primary hover:text-primary/80"
                            onClick={handleAutoRound}
                            title="Auto Round"
                          >
                            <Wand2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <FormControl>
                          <Input type="number" {...field} className="h-8 rounded-lg text-xs" step="0.01" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-muted/30 p-2 rounded-lg space-y-1">
                  {isGstInvoice && (
                    <div className="flex justify-between text-[10px] uppercase text-muted-foreground">
                      <span>GST Amount:</span>
                      <span className="font-mono">₹{(Number(form.watch('total_gst_amount')) || 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold uppercase">
                    <span>Total {isGstInvoice ? '(Incl. Tax)' : ''}:</span>
                    <span className="text-primary">₹{(Number(form.watch('amount')) || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

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

