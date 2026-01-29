

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppState } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@/lib/definitions';
import { addProject, editProject } from '@/lib/store';


const formSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters.'),
  location: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD']),
});

interface ProjectFormProps {
  setOpen: (open: boolean) => void;
  project?: Project;
  onProjectCreated?: (project: Project) => void;
}

export function ProjectForm({ setOpen, project, onProjectCreated }: ProjectFormProps) {
  const { projects, appUser } = useAppState();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project?.name || '',
      location: project?.location || '',
      status: project?.status || 'ACTIVE',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (
      projects.some(
        (p) =>
          p.name.toLowerCase() === values.name.toLowerCase() &&
          p.id !== project?.id
      )
    ) {
      form.setError('name', {
        type: 'manual',
        message: 'A project with this name already exists.',
      });
      return;
    }

    try {
      if (project) {
        await editProject(project.id, {
          name: values.name,
          location: values.location,
          status: values.status
        });
        toast({
          title: 'Success!',
          description: `Project "${values.name}" has been updated.`,
        });
      } else {
        const createdProject = await addProject({
          name: values.name,
          location: values.location,
          status: values.status
        });
        toast({
          title: 'Success!',
          description: `Project "${values.name}" has been created.`,
        });
        if (onProjectCreated) {
          onProjectCreated(createdProject);
        }
      }

      form.reset();
      setOpen(false);
    } catch (error: any) {
      console.error("Project submission error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
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
              <FormLabel className="text-xs font-bold uppercase text-muted-foreground/70">Project Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Downtown High-Rise Foundation" {...field} className="h-9 md:h-10 rounded-xl" />
              </FormControl>
              <FormDescription className="text-[10px]">
                This name must be unique.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs font-bold uppercase text-muted-foreground/70">Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Mumbai, Maharashtra" {...field} className="h-9 md:h-10 rounded-xl" />
              </FormControl>
              <FormDescription className="text-[10px]">
                The city or area where the project is located.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel className="text-xs font-bold uppercase text-muted-foreground/70">Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-9 md:h-10 rounded-xl">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9 md:h-10 rounded-xl text-sm">Cancel</Button>
          <Button type="submit" className="h-9 md:h-10 rounded-xl text-sm">{project ? 'Update' : 'Create'} Project</Button>
        </div>
      </form>
    </Form>
  );
}
