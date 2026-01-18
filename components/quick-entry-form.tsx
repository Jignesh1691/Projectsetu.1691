
'use client';

import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppState } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Combobox } from './ui/combobox';
import { addMultipleItems } from '@/lib/store';

const itemSchema = z.object({
  entryType: z.enum(['transaction', 'recordable']),
  type: z.enum(['income', 'expense', 'asset', 'liability']),
  amount: z.coerce.number().min(0.01, 'Amount > 0.'),
  description: z.string().min(2, 'Min 2 chars.'),
  ledger_id: z.string().min(1, 'Ledger is required.'),
  payment_mode: z.enum(['cash', 'bank']),
});

const formSchema = z.object({
  project_id: z.string().min(1, 'A project is required.'),
  date: z.date(),
  request_message: z.string().optional(),
  items: z.array(itemSchema),
});

interface QuickEntryFormProps {
  setOpen: (open: boolean) => void;
}

export function QuickEntryForm({ setOpen }: QuickEntryFormProps) {
  const { ledgers, currentUser, userEntryAllowedProjects } = useAppState();
  const { toast } = useToast();
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      project_id: '',
      date: new Date(),
      request_message: '',
      items: [
        {
          entryType: 'transaction',
          type: 'expense',
          amount: 0,
          description: '',
          ledger_id: '',
          payment_mode: 'bank',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchItems = form.watch('items');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return;

    try {
      const itemsWithProjectAndDate = values.items.map(item => ({
        ...item,
        project_id: values.project_id,
        date: values.date,
      }));

      await addMultipleItems(itemsWithProjectAndDate, currentUser, values.request_message);

      toast({
        title: 'Success!',
        description: `Successfully added ${values.items.length} new entries.`,
      });

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

  const addNewField = () => {
    append({
      entryType: 'transaction',
      type: 'expense',
      amount: 0,
      description: '',
      ledger_id: '',
      payment_mode: 'bank',
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="p-3 border rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              name="project_id"
              render={({ field }) => (
                <FormItem className="flex flex-col space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Project</FormLabel>
                  <Combobox options={userEntryAllowedProjects.map(p => ({ value: p.id, label: p.name }))} value={field.value} onChange={field.onChange} placeholder="Select a project" searchPlaceholder="Search projects..." notFoundMessage="No project found." className="h-9 md:h-10" />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Date for All Entries</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={'outline'} className={cn('pl-3 text-left font-normal h-9 md:h-10 rounded-xl text-sm', !field.value && 'text-muted-foreground')}>
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
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


        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {fields.map((field, index) => {
            const currentItem = watchItems[index];
            const isTransaction = currentItem.entryType === 'transaction';
            return (
              <div key={field.id} className="p-3 border rounded-lg relative space-y-3 bg-card/50">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>

                <div className="grid grid-cols-2 gap-3 mr-8">
                  <FormField
                    name={`items.${index}.entryType`}
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Entry Type</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          const newType = value === 'transaction' ? 'expense' : 'liability';
                          form.setValue(`items.${index}.type`, newType);
                        }} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 md:h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="transaction">Transaction</SelectItem>
                            <SelectItem value="recordable">Outstanding</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name={`items.${index}.type`}
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Sub-Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 md:h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isTransaction ? (
                              <>
                                <SelectItem value="expense">Expense</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="liability">Payable</SelectItem>
                                <SelectItem value="asset">Receivable</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  name={`items.${index}.ledger_id`}
                  render={({ field }) => (
                    <FormItem className="flex flex-col space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Ledger</FormLabel>
                      <Combobox options={ledgers.map(l => ({ value: l.id, label: l.name }))} value={field.value} onChange={field.onChange} placeholder="Select a ledger" searchPlaceholder="Search ledgers..." notFoundMessage="No ledger found." className="h-9 md:h-10" />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    name={`items.${index}.amount`}
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Amount</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0.00" {...field} className="h-9 md:h-10 rounded-xl font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name={`items.${index}.payment_mode`}
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Payment Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 md:h-10 rounded-xl text-xs"><SelectValue /></SelectTrigger>
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
                  name={`items.${index}.description`}
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Add a short note..." {...field} className="h-9 md:h-10 rounded-xl text-xs" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )
          })}
        </div>

        <Button type="button" variant="outline" className="w-full h-10 rounded-xl border-dashed" onClick={addNewField} size="sm">
          <Plus className="mr-2 h-4 w-4" /> <span className="text-sm">Add Another Entry</span>
        </Button>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-10 md:h-12 rounded-xl text-sm">
            Cancel
          </Button>
          <Button type="submit" className="h-10 md:h-12 rounded-xl text-sm">Submit All Entries</Button>
        </div>
      </form>
    </Form>
  );
}
