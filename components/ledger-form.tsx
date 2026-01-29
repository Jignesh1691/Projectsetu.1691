

'use client';

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
import type { Ledger } from '@/lib/definitions';
import { addLedger, editLedger } from '@/lib/store';
import { Textarea } from './ui/textarea';

const formSchema = z.object({
  name: z.string().min(2, 'Ledger name must be at least 2 characters.'),
  category: z.enum(['income', 'expense']).optional(),
  gst_number: z.string().optional(),
  is_gst_registered: z.boolean().default(false),
  billing_address: z.string().optional(),
  state: z.string().optional(),
  request_message: z.string().optional(),
});

interface LedgerFormProps {
  setOpen: (open: boolean) => void;
  ledger?: Ledger;
  onLedgerCreated?: (ledger: Ledger) => void;
}

export function LedgerForm({ setOpen, ledger, onLedgerCreated }: LedgerFormProps) {
  const { ledgers, currentUser, appUser } = useAppState();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: ledger?.name || '',
      category: ledger?.category || 'expense' as RecordType,
      gst_number: ledger?.gst_number || '',
      is_gst_registered: ledger?.is_gst_registered || false,
      billing_address: ledger?.billing_address || '',
      state: ledger?.state || '',
      request_message: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return;

    if (
      ledgers.some(
        (l) =>
          l.name?.toLowerCase() === values.name.toLowerCase() &&
          l.id !== ledger?.id
      )
    ) {
      form.setError('name', {
        type: 'manual',
        message: 'A ledger with this name already exists.',
      });
      return;
    }

    try {
      if (ledger) {
        await editLedger(ledger.id, values, currentUser, values.request_message);
        toast({
          title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
          description: currentUser.role === 'admin'
            ? `Ledger "${values.name}" has been updated.`
            : `Your edit request for ledger "${values.name}" has been submitted.`,
        });
      } else {
        const createdLedger = await addLedger(values as any, currentUser, values.request_message);
        toast({
          title: 'Success!',
          description: `Ledger "${values.name}" has been created.`,
        });
        if (onLedgerCreated) {
          onLedgerCreated(createdLedger);
        }
      }
      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Something went wrong. Please try again.",
      });
    }
  }

  const isNonAdmin = appUser?.role?.toLowerCase() !== 'admin';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. ABC Corp" {...field} className="h-9 md:h-10 rounded-xl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Category</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="flex h-9 md:h-10 w-full rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="expense">Vendor / Expense</option>
                    <option value="income">Customer / Income</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 border p-3 rounded-xl bg-muted/20 border-border/50">
          <FormField
            control={form.control}
            name="is_gst_registered"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 bg-background">
                <div className="space-y-0.5">
                  <FormLabel className="text-[10px] uppercase">GST Registered</FormLabel>
                </div>
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch('is_gst_registered') && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="gst_number"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">GSTIN</FormLabel>
                      <FormControl>
                        <Input placeholder="22AAAAA0000A1Z5" {...field} className="h-9 md:h-10 rounded-xl font-mono text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">State (Code)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 22 or Chhattisgarh" {...field} className="h-9 md:h-10 rounded-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="billing_address"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Billing Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Full address..." {...field} className="min-h-[50px] rounded-xl text-xs" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>
        {isNonAdmin && (
          <FormField
            control={form.control}
            name="request_message"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Message for Admin</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Please approve this new cost code for materials." {...field} className="min-h-[60px] rounded-xl text-sm" />
                </FormControl>
                <FormDescription className="text-[10px]">
                  Provide a brief reason for this change for the admin to review.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9 md:h-10 rounded-xl text-sm">Cancel</Button>
          <Button type="submit" className="h-9 md:h-10 rounded-xl text-sm">{ledger ? 'Update' : 'Create'} Ledger</Button>
        </div>
      </form>
    </Form>
  );
}
