
'use client';

import React from 'react';
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
import { User } from '@/lib/definitions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { addUser, editUser } from '@/lib/store';
import { useAppState } from '@/hooks/use-store';
import { MultiSelectCombobox } from './ui/multi-select-combobox';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { DialogFooter } from './ui/dialog';

const formSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters.'),
    email: z.string().email('Please enter a valid email.'),
    role: z.enum(['admin', 'user']),
    password: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
    assignedProjects: z.array(z.string()),
    isActive: z.boolean(),
    canViewFinances: z.boolean(),
    canViewOperations: z.boolean(),
    canCreateEntries: z.boolean(),
}).refine(data => {
    if (data.role === 'admin') {
        return true;
    }
    return data.assignedProjects.length > 0;
}, {
    message: "At least one project must be assigned to a user.",
    path: ["assignedProjects"],
}).refine(data => {
    if (data.newPassword || data.confirmPassword) {
        if (!data.newPassword || data.newPassword.length < 6) {
            return false;
        }
        return data.newPassword === data.confirmPassword;
    }
    return true;
}, {
    message: "Passwords must match and be at least 6 characters long.",
    path: ["confirmPassword"],
});


interface UserFormProps {
    setOpen: (open: boolean) => void;
    user?: User & { assignedProjects?: string[] };
    onSuccess?: () => void;
}

export function UserForm({ setOpen, user, onSuccess }: UserFormProps) {
    const { toast } = useToast();
    const { projects, project_users, appUser } = useAppState();

    const userProjects = user?.assignedProjects || (user ? project_users.filter(pu => pu.user_id === user.id).map(pu => pu.project_id) : []);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as any,
        defaultValues: user ? {
            name: user.name || '',
            email: user.email,
            role: (user.role?.toLowerCase() as 'admin' | 'user') || 'user',
            password: '',
            assignedProjects: userProjects,
            isActive: user.isActive !== false,
            canViewFinances: user.canViewFinances !== false,
            canViewOperations: user.canViewOperations !== false,
            canCreateEntries: user.canCreateEntries !== false,
        } : {
            name: '',
            email: '',
            role: 'user',
            password: '',
            assignedProjects: [],
            isActive: true,
            canViewFinances: true,
            canViewOperations: true,
            canCreateEntries: true,
        },
    });

    const role = form.watch('role');

    const isEditingSelf = user?.email?.toLowerCase() === appUser?.email?.toLowerCase();

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (user) {
            const updateData: any = {
                name: values.name,
                role: values.role,
                isActive: values.isActive,
                assignedProjects: values.assignedProjects,
                canViewFinances: values.canViewFinances,
                canViewOperations: values.canViewOperations,
                canCreateEntries: values.canCreateEntries,
            }
            if (values.newPassword) {
                updateData.password = values.newPassword;
            }
            await editUser(user.id, updateData);
            toast({
                title: 'Success!',
                description: `User ${values.name} has been updated.`,
            });
        } else {
            if (!values.password) {
                form.setError('password', { type: 'manual', message: 'Password is required for new users.' });
                return;
            }
            await addUser(values);
            toast({
                title: 'Success!',
                description: `User ${values.name} has been created.`
            });
        }
        form.reset();
        if (onSuccess) onSuccess();
        setOpen(false);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                <ScrollArea className="flex-grow pr-6 -mr-6 max-h-[70vh]">
                    <div className="space-y-3 px-1 pt-1 pb-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Jane Smith" {...field} className="h-9 md:h-10 rounded-xl" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Email / Username</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="e.g. jane@company.com" {...field} readOnly={!!user} className="h-9 md:h-10 rounded-xl" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {user && isEditingSelf ? (
                            <>
                                <Separator />
                                <h3 className="text-xs font-bold uppercase text-muted-foreground/70">Change Password</h3>
                                <FormField
                                    control={form.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">New Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Leave blank to keep current password" {...field} className="h-9 md:h-10 rounded-xl" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Confirm New Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} className="h-9 md:h-10 rounded-xl" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        ) : !user ? (
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="Set an initial password" {...field} className="h-9 md:h-10 rounded-xl" />
                                        </FormControl>
                                        <FormDescription className="text-[10px]">The user will be prompted to change this on first login.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : null}

                        <Separator />

                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Role</FormLabel>
                                    <Select onValueChange={(value) => {
                                        field.onChange(value);
                                        if (value === 'admin') {
                                            form.setValue('assignedProjects', []);
                                        }
                                    }} defaultValue={field.value}
                                        disabled={isEditingSelf}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="h-9 md:h-10 rounded-xl">
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="user">User</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {role === 'user' && (
                            <FormField
                                control={form.control}
                                name="assignedProjects"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col space-y-1">
                                        <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Assigned Projects</FormLabel>
                                        <MultiSelectCombobox
                                            options={projects.map(p => ({ value: p.id, label: p.name }))}
                                            selected={field.value}
                                            onChange={field.onChange}
                                            placeholder="Select projects..."
                                            searchPlaceholder="Search projects..."
                                            notFoundMessage="No projects found."
                                            className="min-h-[36px] rounded-xl"
                                        />
                                        <FormDescription className="text-[10px]">This user will only be able to access these projects.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {!isEditingSelf && (
                            <>
                                <Separator />
                                <FormField
                                    control={form.control}
                                    name="isActive"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3">
                                            <div className="space-y-0.5">
                                                <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Activate User</FormLabel>
                                                <FormDescription className="text-[10px]">
                                                    Inactive users will not be able to log in.
                                                </FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <Separator />
                                <div className="space-y-3 pt-1">
                                    <h3 className="text-xs font-bold uppercase text-muted-foreground/70">Permissions</h3>

                                    <FormField
                                        control={form.control}
                                        name="canViewFinances"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Financial Access</FormLabel>
                                                    <FormDescription className="text-[10px]">
                                                        Can view ledgers, transactions, and reports.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="canViewOperations"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Operation Access</FormLabel>
                                                    <FormDescription className="text-[10px]">
                                                        Can view materials, tasks, and attendance.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="canCreateEntries"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground/70">Create Entries</FormLabel>
                                                    <FormDescription className="text-[10px]">
                                                        Can create new transactions and records.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="flex justify-end gap-2 pt-4 flex-shrink-0">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9 md:h-10 rounded-xl text-sm">Cancel</Button>
                    <Button type="submit" className="h-9 md:h-10 rounded-xl text-sm">{user ? 'Update User' : 'Create User'}</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
