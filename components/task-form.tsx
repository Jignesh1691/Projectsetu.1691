

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
import type { Task, TaskStatus } from '@/lib/definitions';
import { Textarea } from './ui/textarea';
import { Combobox } from './ui/combobox';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar } from './ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import React, { useMemo } from 'react';
import { addTask, editTask } from '@/lib/store';
import { ScrollArea } from './ui/scroll-area';
import { DialogFooter } from './ui/dialog';

const formSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  description: z.string().optional(),
  project_id: z.string().min(1, 'Please select a project.'),
  status: z.enum(['todo', 'in-progress', 'done']),
  due_date: z.date().optional(),
  request_message: z.string().optional(),
});

interface TaskFormProps {
  setOpen: (open: boolean) => void;
  task?: Task;
}

export function TaskForm({ setOpen, task }: TaskFormProps) {
  const { currentUser, userVisibleProjects, appUser } = useAppState();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: task ? {
      ...(task.pending_data ? task.pending_data as any : task),
      due_date: task.due_date ? new Date(task.due_date) : undefined,
      request_message: '',
    } : {
      title: '',
      description: '',
      status: 'todo',
      request_message: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!currentUser) return;

    try {
      const taskData = {
        ...values,
        due_date: values.due_date?.toISOString(),
      };

      if (task) {
        await editTask(task.id, taskData, currentUser, values.request_message);
        toast({
          title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
          description: currentUser.role === 'admin' ? `Task "${values.title}" has been updated.` : 'Your edit request has been submitted for approval.',
        });
      } else {
        await addTask(taskData, currentUser, values.request_message);
        toast({
          title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
          description: currentUser.role === 'admin' ? `Task "${values.title}" has been created.` : `Task "${values.title}" has been submitted for approval.`,
        });
      }
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Failed to submit task:", error);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
        <ScrollArea className="flex-grow pr-6 -mr-6 max-h-[70vh]">
          <div className="space-y-3 px-1 pt-1 pb-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Finalize electrical plan" {...field} className="h-9 md:h-10 rounded-xl font-bold" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
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
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9 md:h-10 rounded-xl text-sm">
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Due Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn('pl-3 text-left font-normal h-9 md:h-10 rounded-xl text-sm', !field.value && 'text-muted-foreground')}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add more details about the task..." {...field} className="min-h-[60px] rounded-xl text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isNonAdmin && task && (
              <FormField
                control={form.control}
                name="request_message"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Message for Admin</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Please approve this task for the new phase." {...field} className="min-h-[60px] rounded-xl text-sm" />
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
        <DialogFooter className="flex-shrink-0 pt-3 gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-10 md:h-12 rounded-xl flex-1 text-sm">Cancel</Button>
          <Button type="submit" className="h-10 md:h-12 rounded-xl flex-1 text-sm">{task ? 'Update' : 'Create'} Task</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

