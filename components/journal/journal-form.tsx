
'use client';

import { useState } from 'react';
import { useAppState } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface JournalFormProps {
    onSuccess?: () => void;
    initialData?: any;
    mode?: 'create' | 'edit';
    onCancel?: () => void;
}

export function JournalForm({ onSuccess, initialData, mode = 'create', onCancel }: JournalFormProps) {
    const { ledgers, projects, setState } = useAppState();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        date: initialData?.date ? format(new Date(initialData.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        amount: initialData?.amount?.toString() || '',
        description: initialData?.description || '',
        debitMode: initialData?.debit_mode || 'ledger',
        debitLedgerId: initialData?.debit_ledger_id || '',
        debitProjectId: initialData?.debit_project_id || '',
        creditMode: initialData?.credit_mode || 'ledger',
        creditLedgerId: initialData?.credit_ledger_id || '',
        creditProjectId: initialData?.credit_project_id || '',
        requestMessage: '',
    });

    const isPending = initialData?.approval_status && initialData.approval_status !== 'approved';
    const pendingData = initialData?.pending_data || {};

    // If pending edit, show pending values (optional enhancement, sticking to current data for now)

    const ledgerOptions = ledgers.map(l => ({ value: l.id, label: l.name }));
    const projectOptions = projects.map(p => ({ value: p.id, label: p.name }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (formData.debitMode === 'ledger' && !formData.debitLedgerId) throw new Error("Select Debit Ledger");
            if (formData.creditMode === 'ledger' && !formData.creditLedgerId) throw new Error("Select Credit Ledger");
            if (!formData.debitProjectId) throw new Error("Select Project for Debit side");
            if (!formData.creditProjectId) throw new Error("Select Project for Credit side");

            const url = '/api/journal';
            const method = mode === 'edit' ? 'PUT' : 'POST';
            const body = mode === 'edit' ? { id: initialData.id, ...formData } : formData;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to save entry');
            }

            const responseData = await res.json();

            // Direct Store Update
            setState((prev: any) => {
                let updatedEntries = [];
                if (mode === 'create') {
                    updatedEntries = [responseData.data, ...prev.journal_entries];
                } else {
                    updatedEntries = prev.journal_entries.map((e: any) =>
                        e.id === initialData.id ? responseData : e
                        // Note: API returns approvalStatus, we might need to map it carefully depending on how API response is structured
                        // The API returns the updated object directly or wrapped. 
                        // Check API: PUT returns apiResponse.success(updated) -> { data: updated }
                    );
                    // If it&apos;s a pending edit, the main list might not update visibly until refresh or we handle optimistic updates better. 
                    // For now simple map is fine.
                }
                return { ...prev, journal_entries: updatedEntries };
            });

            toast({
                title: mode === 'edit' ? 'Update Requested' : 'Success',
                description: mode === 'edit' ? 'Journal Entry update submitted' : 'Journal Entry Created'
            });

            if (mode === 'create') {
                setFormData({
                    date: format(new Date(), 'yyyy-MM-dd'),
                    amount: '',
                    description: '',
                    debitMode: 'ledger',
                    debitLedgerId: '',
                    debitProjectId: '',
                    creditMode: 'ledger',
                    creditLedgerId: '',
                    creditProjectId: '',
                    requestMessage: ''
                });
            }

            if (onSuccess) onSuccess();

        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const AccountSelect = ({ mode, setMode, ledgerId, setLedgerId, projectId, setProjectId, label }: any) => (
        <div className="space-y-4 border p-4 rounded-xl bg-card shadow-sm">
            <Label className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{label}</Label>
            <RadioGroup
                value={mode}
                onValueChange={(val) => setMode(val)}
                className="flex flex-row flex-wrap gap-x-4 gap-y-2"
            >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id={`${label}-cash`} />
                    <Label htmlFor={`${label}-cash`} className="cursor-pointer text-sm font-medium">Cash</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bank" id={`${label}-bank`} />
                    <Label htmlFor={`${label}-bank`} className="cursor-pointer text-sm font-medium">Bank</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ledger" id={`${label}-ledger`} />
                    <Label htmlFor={`${label}-ledger`} className="cursor-pointer text-sm font-medium">Ledger</Label>
                </div>
            </RadioGroup>

            <div className="space-y-3 pt-2">
                {mode === 'ledger' && (
                    <div className="animate-in fade-in slide-in-from-top-1">
                        <Combobox
                            options={ledgerOptions}
                            value={ledgerId}
                            onChange={(val) => setLedgerId(val)}
                            placeholder="Select Ledger..."
                            searchPlaceholder="Search ledger..."
                            notFoundMessage="No ledger found."
                        />
                    </div>
                )}

                <div className="animate-in fade-in slide-in-from-top-1">
                    <Combobox
                        options={projectOptions}
                        value={projectId}
                        onChange={(val) => setProjectId(val)}
                        placeholder="Select Project*"
                        searchPlaceholder="Search project..."
                        notFoundMessage="No project found."
                    />
                </div>
            </div>
        </div>
    );

    return (
        <Card className={mode === 'edit' ? "border-0 shadow-none" : "border-border/50 shadow-sm rounded-2xl"}>
            <CardHeader className="pb-4">
                <CardTitle>{mode === 'edit' ? 'Edit Journal Entry' : 'New Journal Entry'}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Date</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                                className="rounded-xl h-9 px-2 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Amount</Label>
                            <Input
                                type="number"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                required
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="rounded-xl font-bold h-9 px-2 text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold">Description</Label>
                        <Textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            required
                            placeholder="Enter transaction details..."
                            className="rounded-xl resize-none text-sm min-h-[50px]"
                            rows={2}
                        />
                    </div>

                    {mode === 'edit' && (
                        <div className="space-y-1">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Reason for Update</Label>
                            <Textarea
                                value={formData.requestMessage}
                                onChange={e => setFormData({ ...formData, requestMessage: e.target.value })}
                                placeholder="Why are you changing this?"
                                className="rounded-xl resize-none text-sm min-h-[50px]"
                                rows={2}
                            />
                        </div>
                    )}

                    <Tabs defaultValue="debit" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-3 h-9">
                            <TabsTrigger value="debit" className="text-[10px] font-bold uppercase tracking-wider h-8">Receiver (Dr)</TabsTrigger>
                            <TabsTrigger value="credit" className="text-[10px] font-bold uppercase tracking-wider h-8">Giver (Cr)</TabsTrigger>
                        </TabsList>
                        <TabsContent value="debit" className="focus-visible:outline-none">
                            <AccountSelect
                                label="Debit (Receiver)"
                                mode={formData.debitMode}
                                setMode={(v: any) => setFormData({ ...formData, debitMode: v, debitLedgerId: '' })}
                                ledgerId={formData.debitLedgerId}
                                setLedgerId={(v: any) => setFormData({ ...formData, debitLedgerId: v })}
                                projectId={formData.debitProjectId}
                                setProjectId={(v: any) => setFormData({ ...formData, debitProjectId: v })}
                            />
                        </TabsContent>
                        <TabsContent value="credit" className="focus-visible:outline-none">
                            <AccountSelect
                                label="Credit (Giver)"
                                mode={formData.creditMode}
                                setMode={(v: any) => setFormData({ ...formData, creditMode: v, creditLedgerId: '' })}
                                ledgerId={formData.creditLedgerId}
                                setLedgerId={(v: any) => setFormData({ ...formData, creditLedgerId: v })}
                                projectId={formData.creditProjectId}
                                setProjectId={(v: any) => setFormData({ ...formData, creditProjectId: v })}
                            />
                        </TabsContent>
                    </Tabs>

                    <div className="flex gap-3">
                        {onCancel && (
                            <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-xl h-10 md:h-12 text-sm">
                                Cancel
                            </Button>
                        )}
                        <Button type="submit" disabled={loading} className="flex-1 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 h-10 md:h-12 text-sm font-semibold">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'edit' ? 'Update Entry' : 'Record Entry'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
