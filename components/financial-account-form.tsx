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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppState } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { FinancialAccount } from '@/lib/definitions';
import { addFinancialAccount, editFinancialAccount } from '@/lib/store';
import { FinancialAccountSchema } from '@/lib/api-utils';

interface FinancialAccountFormProps {
    setOpen: (open: boolean) => void;
    account?: FinancialAccount;
    onAccountCreated?: (account: FinancialAccount) => void;
}

export function FinancialAccountForm({ setOpen, account, onAccountCreated }: FinancialAccountFormProps) {
    const { appUser } = useAppState();
    const { toast } = useToast();

    // inferred type from schema
    type FormValues = z.infer<typeof FinancialAccountSchema>;

    const form = useForm<FormValues>({
        resolver: zodResolver(FinancialAccountSchema),
        defaultValues: {
            name: account?.name || '',
            type: (account?.type as "CASH" | "BANK") || 'CASH',
            accountNumber: account?.accountNumber || '',
            bankName: account?.bankName || '',
            ifscCode: account?.ifscCode || '',
            openingBalance: account?.openingBalance || 0,
        },
    });

    const accountType = form.watch('type');

    async function onSubmit(values: z.infer<typeof FinancialAccountSchema>) {
        if (!appUser) return;

        try {
            if (account) {
                await editFinancialAccount(account.id, values, appUser);
                toast({
                    title: 'Success!',
                    description: `Account "${values.name}" has been updated.`,
                });
            } else {
                const createdAccount = await addFinancialAccount(values, appUser);
                toast({
                    title: 'Success!',
                    description: `Account "${values.name}" has been created.`,
                });
                if (onAccountCreated) {
                    onAccountCreated(createdAccount as FinancialAccount);
                }
            }

            form.reset();
            setOpen(false);
        } catch (error: any) {
            console.error("Account submission error:", error);
            const isTechnicalError = error.message?.includes('undefined') || error.message?.includes('prisma');
            toast({
                variant: "destructive",
                title: "Error",
                description: isTechnicalError
                    ? "Failed to save account due to a system error. Please try again or contact support."
                    : (error.message || "Something went wrong. Please try again."),
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
                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground/70">Account Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Petty Cash / HDFC Bank" {...field} className="h-9 md:h-10 rounded-xl" />
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
                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground/70">Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-9 md:h-10 rounded-xl">
                                        <SelectValue placeholder="Select account type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="BANK">Bank</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {accountType === 'BANK' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="bankName"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-bold uppercase text-muted-foreground/70">Bank Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. HDFC" {...field} value={field.value || ''} className="h-9 md:h-10 rounded-xl" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="ifscCode"
                                render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-bold uppercase text-muted-foreground/70">IFSC Code</FormLabel>
                                        <FormControl>
                                            <Input placeholder="IFSC" {...field} value={field.value || ''} className="h-9 md:h-10 rounded-xl uppercase" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="accountNumber"
                            render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground/70">Account Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Account No." {...field} value={field.value || ''} className="h-9 md:h-10 rounded-xl" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </>
                )}

                {/* Only allow setting opening balance on creation, or maybe edit? DB schema has it. Let's allow edit for now but usually it's locked. */}
                <FormField
                    control={form.control}
                    name="openingBalance"
                    render={({ field }) => (
                        <FormItem className="space-y-1">
                            <FormLabel className="text-xs font-bold uppercase text-muted-foreground/70">Opening Balance</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="0.00" {...field} className="h-9 md:h-10 rounded-xl" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-9 md:h-10 rounded-xl text-sm">Cancel</Button>
                    <Button type="submit" className="h-9 md:h-10 rounded-xl text-sm">{account ? 'Update' : 'Create'} Account</Button>
                </div>
            </form>
        </Form>
    );
}
