
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
import { useToast } from '@/hooks/use-toast';
import type { Labor, User } from '@/lib/definitions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { addLabor, editLabor } from '@/lib/store';
import { useAppState } from '@/hooks/use-store';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  type: z.enum(['laborer', 'foreman']),
  rate: z.coerce.number().min(1, 'Daily rate must be greater than 0.'),
});

interface LaborFormProps {
  setOpen: (open: boolean) => void;
  labor?: Labor;
}

export function LaborForm({ setOpen, labor }: LaborFormProps) {
  const { toast } = useToast();
  const { currentUser } = useAppState();

  const form = useForm<any>({
    resolver: zodResolver(formSchema as any) as any,
    defaultValues: labor ? {
      name: labor.name,
      type: labor.type as 'laborer' | 'foreman',
      rate: labor.rate,
    } : {
      name: '',
      type: 'laborer',
      rate: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return;

    try {
      if (labor) {
        await editLabor(labor.id, values);
        toast({
          title: 'Success!',
          description: `Details for ${values.name} have been updated.`,
        });
      } else {
        await addLabor(values, currentUser);
        toast({
          title: 'Success!',
          description: `${values.name} has been added to the labor list.`,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. John Doe" {...field} className="h-9 md:h-10 rounded-xl" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-9 md:h-10 rounded-xl">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="laborer">Laborer</SelectItem>
                  <SelectItem value="foreman">Foreman</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rate"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Daily Rate (₹)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g. 800" {...field} className="h-9 md:h-10 rounded-xl" />
              </FormControl>
              <FormDescription className="text-[10px]">
                The daily wage for this person.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9 md:h-10 rounded-xl text-sm">Cancel</Button>
          <Button type="submit" className="h-9 md:h-10 rounded-xl text-sm">{labor ? 'Update' : 'Add'} Labor</Button>
        </div>
      </form>
    </Form>
  );
}
