

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
  assigned_users: z.array(z.object({
    userId: z.string(),
    canViewFinances: z.boolean(),
    canCreateEntries: z.boolean(),
  })),
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
        ? project_users.filter(pu => pu.project_id === project.id).map(pu => ({
          userId: pu.user_id,
          canViewFinances: pu.can_view_finances ?? true,
          canCreateEntries: pu.can_create_entries ?? true
        }))
        : (appUser ? [{
          userId: appUser.id,
          canViewFinances: true,
          canCreateEntries: true
        }] : []),
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
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="mb-2">
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground/70">Assign Users & Permissions</FormLabel>
                <FormDescription className="text-[10px]">
                  Select users and set their financial access levels.
                </FormDescription>
              </div>
              <div className="rounded-xl border p-3 max-h-[300px] overflow-y-auto bg-card/50">
                <div className="space-y-4">
                  {users.map((user) => {
                    const isSelected = field.value?.some(u => u.userId === user.id);
                    const userData = field.value?.find(u => u.userId === user.id);

                    return (
                      <div key={user.id} className="space-y-2 pb-2 border-b last:border-0 border-border/50">
                        <div className="flex flex-row items-center space-x-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, { userId: user.id, canViewFinances: true, canCreateEntries: true }]);
                              } else {
                                field.onChange(current.filter(u => u.userId !== user.id));
                              }
                            }}
                            className="h-4 w-4"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium leading-none">
                              {user.name} <span className="text-[10px] text-muted-foreground uppercase ml-1 opacity-70">({user.role})</span>
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="ml-7 grid grid-cols-2 gap-2 p-2 bg-muted/30 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`finance-${user.id}`}
                                checked={userData?.canViewFinances}
                                onCheckedChange={(checked) => {
                                  field.onChange(field.value.map(u =>
                                    u.userId === user.id ? { ...u, canViewFinances: !!checked } : u
                                  ));
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <label htmlFor={`finance-${user.id}`} className="text-[10px] font-medium leading-none cursor-pointer">
                                See Ledger/Finances
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`entries-${user.id}`}
                                checked={userData?.canCreateEntries}
                                onCheckedChange={(checked) => {
                                  field.onChange(field.value.map(u =>
                                    u.userId === user.id ? { ...u, canCreateEntries: !!checked } : u
                                  ));
                                }}
                                className="h-3.5 w-3.5"
                              />
                              <label htmlFor={`entries-${user.id}`} className="text-[10px] font-medium leading-none cursor-pointer">
                                Create Entries
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
