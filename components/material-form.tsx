

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
import type { Material } from '@/lib/definitions';
import { addMaterial, editMaterial } from '@/lib/store';
import { useAppState } from '@/hooks/use-store';
import { Textarea } from './ui/textarea';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  unit: z.string().min(1, 'Unit is required (e.g., bags, kg, nos).'),
  request_message: z.string().optional(),
});

interface MaterialFormProps {
  setOpen: (open: boolean) => void;
  material?: Material;
}

export function MaterialForm({ setOpen, material }: MaterialFormProps) {
  const { toast } = useToast();
  const { currentUser, appUser } = useAppState();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: material ? {
      ...(material.pending_data ? (material.pending_data as any) : material)
    } : {
      name: '',
      unit: '',
      request_message: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return;
    if (material) {
      await editMaterial(material.id, values, currentUser, values.request_message);
      toast({
        title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
        description: currentUser.role === 'admin' ? `Material ${values.name} has been updated.` : `Your edit request for material "${values.name}" has been submitted for approval.`,
      });
    } else {
      await addMaterial(values, currentUser, values.request_message);
      toast({
        title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
        description: currentUser.role === 'admin'
          ? `Material ${values.name} has been created.`
          : `Request to create material "${values.name}" submitted for approval.`
      });
    }
    form.reset();
    setOpen(false);
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
              <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Material Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Cement" {...field} className="h-9 md:h-10 rounded-xl" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Unit of Measurement</FormLabel>
              <FormControl>
                <Input placeholder="e.g. bags, kg, nos, ton" {...field} className="h-9 md:h-10 rounded-xl" />
              </FormControl>
              <FormDescription className="text-[10px]">
                How this material is measured.
              </FormDescription>
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
                  <Textarea placeholder="e.g., Please correct the unit for this material." {...field} className="min-h-[60px] rounded-xl text-sm" />
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
          <Button type="submit" className="h-9 md:h-10 rounded-xl text-sm">{material ? 'Update' : 'Add'} Material</Button>
        </div>
      </form>
    </Form>
  );
}
