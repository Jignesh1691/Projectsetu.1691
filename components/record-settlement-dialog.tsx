'use client';

import { useState, useEffect } from 'react';
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
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import type { Recordable, User } from '@/lib/definitions';
import { addRecordSettlement } from '@/lib/store';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';

const formSchema = z.object({
    settlement_date: z.date(),
    amount_paid: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
    payment_mode: z.enum(['cash', 'bank']),
    financial_account_id: z.string().optional(),
    remarks: z.string().optional(),
    convert_to_transaction: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface RecordSettlementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: Recordable;
}

export function RecordSettlementDialog({ open, onOpenChange, record }: RecordSettlementDialogProps) {
    const { currentUser, financial_accounts } = useAppState();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: {
            settlement_date: new Date(),
            amount_paid: record.balance_amount || record.amount,
            payment_mode: record.payment_mode || 'bank',
            financial_account_id: record.financial_account_id || '',
            remarks: '',
            convert_to_transaction: true,
        },
    });

    const paymentMode = form.watch('payment_mode');

    useEffect(() => {
        if (open) {
            form.reset({
                settlement_date: new Date(),
                amount_paid: record.balance_amount || record.amount,
                payment_mode: record.payment_mode || 'bank',
                financial_account_id: record.financial_account_id || '',
                remarks: '',
                convert_to_transaction: true,
            });
        }
    }, [open, record, form]);

    useEffect(() => {
        const currentAccId = form.getValues('financial_account_id');
        const mode = paymentMode;
        const accounts = financial_accounts.filter(a => a.type === (mode === 'cash' ? 'CASH' : 'BANK'));

        const currentAcc = financial_accounts.find(a => a.id === currentAccId);

        if (currentAcc && currentAcc.type !== (mode === 'cash' ? 'CASH' : 'BANK')) {
            const defaultAcc = accounts.find(a => a.name.toLowerCase().includes('default')) || accounts[0];
            form.setValue('financial_account_id', defaultAcc ? defaultAcc.id : '');
        } else if (!currentAccId && accounts.length > 0) {
            const defaultAcc = accounts.find(a => a.name.toLowerCase().includes('default')) || accounts[0];
            form.setValue('financial_account_id', defaultAcc.id);
        }
    }, [paymentMode, financial_accounts, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!currentUser) return;
        setLoading(true);

        try {
            await addRecordSettlement(record.id, {
                ...values,
                settlement_date: values.settlement_date.toISOString(),
            });

            toast({
                title: 'Payment Recorded',
                description: `Successfully recorded payment of ₹${values.amount_paid} for ${record.description}`,
            });

            onOpenChange(false);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to record payment.",
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Payment / Settlement</DialogTitle>
                    <DialogDescription>
                        Record a partial or full payment against this outstanding record.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/30 p-3 rounded-xl mb-4 text-xs space-y-1 border border-border/50">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Description:</span>
                        <span className="font-semibold">{record.description}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="font-semibold">₹{record.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Balance Due:</span>
                        <span className="font-bold text-primary">₹{(record.balance_amount ?? record.amount).toLocaleString()}</span>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount_paid"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Amount Paid</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="0.00" {...field} className="h-10 rounded-xl font-bold" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="settlement_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col space-y-1">
                                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Payment Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={'outline'}
                                                        className={cn(
                                                            'w-full h-10 px-3 text-left font-normal rounded-xl',
                                                            !field.value && 'text-muted-foreground'
                                                        )}
                                                    >
                                                        {field.value ? format(field.value, 'dd/MM/yy') : <span>Pick</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="payment_mode"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Mode</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-10 rounded-xl">
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
                            <FormField
                                control={form.control}
                                name="financial_account_id"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                            {paymentMode === 'cash' ? 'Cash Box' : 'Bank Account'}
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="h-10 rounded-xl">
                                                    <SelectValue placeholder="Account" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {financial_accounts
                                                    .filter(a => a.type === (paymentMode === 'cash' ? 'CASH' : 'BANK'))
                                                    .map(account => (
                                                        <SelectItem key={account.id} value={account.id}>
                                                            {account.name}
                                                        </SelectItem>
                                                    ))
                                                }
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="remarks"
                            render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Remarks</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Payment details, cheque no, etc." {...field} className="min-h-[60px] rounded-xl text-sm" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="convert_to_transaction"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-xs font-bold uppercase">Record in Cash/Bank Book</FormLabel>
                                        <FormDescription className="text-[10px]">Automatically creates a transaction entry</FormDescription>
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

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl" disabled={loading}>
                                Cancel
                            </Button>
                            <Button type="submit" className="rounded-xl min-w-[120px]" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Record Payment'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
