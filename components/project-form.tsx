

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
import { Project } from '@/lib/definitions';
import { addProject, editProject } from '@/lib/store';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters.'),
  location: z.string().optional(),
  assigned_users: z.array(z.string()),
});

interface ProjectFormProps {
  setOpen: (open: boolean) => void;
  project?: Project;
  onProjectCreated?: (project: Project) => void;
}

export function ProjectForm({ setOpen, project, onProjectCreated }: ProjectFormProps) {
  const { projects, project_users, users, appUser } = useAppState();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: project?.name || '',
      location: project?.location || '',
      assigned_users: project
        ? project_users.filter(pu => pu.project_id === project.id).map(pu => pu.user_id)
        : (appUser ? [appUser.id] : []),
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
        await editProject(project.id, { name: values.name, location: values.location }, values.assigned_users);
        toast({
          title: 'Success!',
          description: `Project "${values.name}" has been updated.`,
        });
      } else {
        console.log("DEBUG: Submitting new project with users:", values.assigned_users);
        const createdProject = await addProject({ name: values.name, location: values.location }, values.assigned_users);
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
          name="assigned_users"
          render={() => (
            <FormItem className="space-y-2">
              <div className="mb-2">
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground/70">Assign Users</FormLabel>
                <FormDescription className="text-[10px]">
                  Select the users who will be assigned to this project.
                </FormDescription>
              </div>
              <div className="rounded-xl border p-3 max-h-[180px] overflow-y-auto bg-card/50">
                <div className="space-y-1.5">
                  {users.map((user) => (
                    <FormField
                      key={user.id}
                      control={form.control}
                      name="assigned_users"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={user.id}
                            className="flex flex-row items-center space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(user.id)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  return checked
                                    ? field.onChange([...current, user.id])
                                    : field.onChange(
                                      current.filter(
                                        (value) => value !== user.id
                                      )
                                    )
                                }}
                                className="h-4 w-4"
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer text-sm">
                              {user.name} <span className="text-xs text-muted-foreground">({user.role})</span>
                            </FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                </div>
              </div>
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
