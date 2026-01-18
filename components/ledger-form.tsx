

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
      request_message: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return;

    if (
      ledgers.some(
        (l) =>
          l.name.toLowerCase() === values.name.toLowerCase() &&
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
        await editLedger(ledger.id, { name: values.name }, currentUser, values.request_message);
        toast({
          title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
          description: currentUser.role === 'admin'
            ? `Ledger "${values.name}" has been updated.`
            : `Your edit request for ledger "${values.name}" has been submitted.`,
        });
      } else {
        const newLedgerData = {
          name: values.name,
        };
        const createdLedger = await addLedger(newLedgerData, currentUser, values.request_message);
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Ledger Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Labor Costs, Materials" {...field} className="h-9 md:h-10 rounded-xl" />
              </FormControl>
              <FormDescription className="text-[10px]">
                This is for categorizing your transactions (e.g. cost codes).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {isNonAdmin && ledger && (
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
