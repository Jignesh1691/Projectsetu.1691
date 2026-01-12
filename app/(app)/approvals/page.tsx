
'use client';

import React, { useMemo, useState } from 'react';
import { useAppState } from '@/hooks/use-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { Transaction, Recordable, Task, Photo, Document as AppDocument, Hajari, Material, MaterialLedgerEntry, Ledger } from '@/lib/definitions';
import { Check, X, FileText, Camera, ReceiptText, ArrowRightLeft, ClipboardList, MessageSquare, Users, Layers, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { approveChange, rejectChange } from '@/lib/store';



type PendingItem = (Transaction | Recordable | Task | Photo | AppDocument | Hajari | Material | MaterialLedgerEntry | Ledger) & { itemType: string };

type ApprovalAction = 'approve' | 'reject';

export default function ApprovalsPage() {
    const { transactions, recordables, tasks, photos, documents, appUser, projects, ledgers, users, labors, hajari_records, materials, material_ledger } = useAppState();
    const { toast } = useToast();


    const [isDialog, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
    const [approvalAction, setApprovalAction] = useState<ApprovalAction | null>(null);
    const [remarks, setRemarks] = useState('');

    const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'N/A';
    const getLedgerName = (id: string) => ledgers.find(l => l.id === id)?.name || 'N/A';
    const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown User';
    const getLaborName = (id: string) => labors.find(l => l.id === id)?.name || 'Unknown Labor';
    const getMaterialName = (id: string) => materials.find(m => m.id === id)?.name || 'N/A';

    const pendingItems = useMemo(() => {
        const allItems: PendingItem[] = [
            ...transactions.map(t => ({ ...t, itemType: 'transaction' })),
            ...recordables.map(r => ({ ...r, itemType: 'recordable' })),
            ...tasks.map(t => ({ ...t, itemType: 'task' })),
            ...photos.map(p => ({ ...p, itemType: 'photo' })),
            ...documents.map(d => ({ ...d, itemType: 'document' })),
            ...hajari_records.map(h => ({ ...h, itemType: 'hajari' })),
            ...materials.map(m => ({ ...m, itemType: 'material' })),
            ...material_ledger.map(ml => ({ ...ml, itemType: 'materialledgerentry' })),
            ...ledgers.map(l => ({ ...l, itemType: 'ledger' })),
        ];
        // Only show items that are actively pending a decision
        return allItems.filter(item =>
            item.approval_status === 'pending-edit' ||
            item.approval_status === 'pending-delete' ||
            item.approval_status === 'pending-create'
        );
    }, [transactions, recordables, tasks, photos, documents, hajari_records, materials, material_ledger, ledgers]);

    const handleActionClick = (item: PendingItem, action: ApprovalAction) => {
        setSelectedItem(item);
        setApprovalAction(action);
        setRemarks('');
        setIsDialogOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!selectedItem || !approvalAction) return;

        try {
            if (approvalAction === 'approve') {
                await approveChange(selectedItem.itemType, selectedItem.id);
                toast({ title: "Change Approved", description: "The change has been applied." });
            } else {
                await rejectChange(selectedItem.itemType, selectedItem.id, remarks);
                toast({ title: "Change Rejected", description: "The pending change has been discarded." });
            }
        } catch (error) {
            console.error("Failed to process approval:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not process the request." });
        }

        setIsDialogOpen(false);
        setSelectedItem(null);
        setApprovalAction(null);
    };

    const getItemTitle = (item: PendingItem): string => {
        switch (item.itemType) {
            case 'hajari':
                const hajari = item as Hajari;
                const laborName = getLaborName(hajari.labor_id);
                const month = new Date(hajari.date).toLocaleString('default', { month: 'long' });
                return `Hajari Settlement for ${laborName} - ${month}`;
            default:
                return (item as any).description || (item as any).title || (item as any).document_name || (item as any).name || 'Untitled';
        }
    }

    const renderItemDetails = (item: PendingItem) => {
        const original = { ...item };
        const pending = (item as any).pending_data ? { ...(item as any).pending_data } : {};

        if (item.itemType === 'transaction') {
            const tx = original as Transaction;
            const pendingTx = pending as Partial<Transaction>;
            return (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-muted-foreground">Project</div> <div>{getProjectName(tx.project_id)}</div>
                    <div className="text-muted-foreground">Ledger</div> <div>{getLedgerName(tx.ledger_id)}</div>
                    <div className="text-muted-foreground">Date</div> <div>{new Date(tx.date).toLocaleDateString()}</div>
                    <div className="text-muted-foreground">Amount</div> <div className={cn(tx.type === 'income' ? 'text-green-600' : 'text-red-600')}>{formatCurrency(tx.amount)}</div>
                    {item.approval_status === 'pending-edit' && (
                        <>
                            <div className="col-span-2 font-semibold mt-2 pt-2 border-t">Pending Changes:</div>
                            {Object.keys(pendingTx).map(key => {
                                const k = key as keyof Partial<Transaction>;
                                if (pendingTx[k] !== tx[k as keyof typeof tx]) {
                                    const originalValue = String(tx[k as keyof typeof tx] || '');
                                    const pendingValue = String(pendingTx[k] || '');
                                    return (
                                        <React.Fragment key={k}>
                                            <div className="text-muted-foreground capitalize">{k}</div>
                                            <div><span className="line-through text-muted-foreground">{originalValue}</span> <span className="text-primary font-semibold">{pendingValue}</span></div>
                                        </React.Fragment>
                                    )
                                }
                                return null;
                            })}
                        </>
                    )}
                </div>
            )
        }

        if (item.itemType === 'photo') {
            const photo = original as Photo;
            return (
                <div className="text-sm space-y-2">
                    <p><strong>Project:</strong> {getProjectName(photo.project_id)}</p>
                    <p><strong>Description:</strong> {photo.description}</p>
                    <div className="relative aspect-video w-full max-w-sm">
                        <Image src={photo.image_url} alt={photo.description} fill className="object-cover rounded-md" />
                    </div>
                </div>
            )
        }
        if (item.itemType === 'document') {
            const doc = original as AppDocument;
            return (
                <div className="text-sm space-y-2">
                    <p><strong>Project:</strong> {getProjectName(doc.project_id)}</p>
                    <p><strong>Document Name:</strong> {doc.document_name}</p>
                    <p><strong>Description:</strong> {doc.description}</p>
                </div>
            )
        }
        if (item.itemType === 'hajari') {
            const hajari = item as Hajari;
            return (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-muted-foreground">Labor</div> <div>{getLaborName(hajari.labor_id)}</div>
                    <div className="text-muted-foreground">Month</div> <div>{new Date(hajari.date).toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                    <div className="text-muted-foreground">Settlement Amount</div> <div className='font-semibold'>{formatCurrency(hajari.upad)}</div>
                </div>
            )
        }
        if (item.itemType === 'material') {
            const material = item as Material;
            return (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-muted-foreground">Name</div> <div>{material.name}</div>
                    <div className="text-muted-foreground">Unit</div> <div>{material.unit}</div>
                </div>
            );
        }
        if (item.itemType === 'ledger') {
            const ledger = item as Ledger;
            return (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-muted-foreground">Name</div> <div>{ledger.name}</div>
                </div>
            );
        }
        if (item.itemType === 'materialledgerentry') {
            const entry = item as MaterialLedgerEntry;
            return (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div className="text-muted-foreground">Material</div> <div>{getMaterialName(entry.material_id)}</div>
                    <div className="text-muted-foreground">Project</div> <div>{getProjectName(entry.project_id)}</div>
                    <div className="text-muted-foreground">Type</div> <div className='capitalize'>{entry.type}</div>
                    <div className="text-muted-foreground">Quantity</div> <div>{entry.quantity}</div>
                </div>
            );
        }
        return <p className="text-sm">{item.itemType}</p>
    };

    const getItemIcon = (itemType: string) => {
        switch (itemType) {
            case 'transaction': return <ArrowRightLeft className="h-5 w-5" />;
            case 'recordable': return <ReceiptText className="h-5 w-5" />;
            case 'task': return <ClipboardList className="h-5 w-5" />;
            case 'photo': return <Camera className="h-5 w-5" />;
            case 'document': return <FileText className="h-5 w-5" />;
            case 'hajari': return <Users className="h-5 w-5" />;
            case 'material': return <Layers className="h-5 w-5" />;
            case 'materialledgerentry': return <History className="h-5 w-5" />;
            default: return null;
        }
    };

    const showRemarksForRejection = approvalAction === 'reject';


    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold tracking-tight">Approval Requests</h1>
                        <p className="text-sm text-muted-foreground">Review and process change requests submitted by your team.</p>
                    </div>
                </div>

                {pendingItems.length > 0 ? (
                    <Card>
                        <CardContent className="p-0">
                            <Accordion type="single" collapsible className="w-full">
                                {pendingItems.map(item => (
                                    <AccordionItem value={item.id} key={item.id}>
                                        <AccordionTrigger className="px-6 hover:no-underline">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-muted rounded-md">{getItemIcon(item.itemType)}</div>
                                                <div className="text-left">
                                                    <p className="font-semibold">{getItemTitle(item)}</p>
                                                    <p className="text-sm text-muted-foreground capitalize">{item.itemType.replace('materialledgerentry', 'Ledger Entry')} - <span className={cn(item.approval_status === 'pending-edit' || item.approval_status === 'pending-create' ? 'text-amber-600' : 'text-red-600')}>{item.approval_status?.replace('-', ' ')}</span></p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-4">
                                            <div className="bg-muted/50 p-4 rounded-md space-y-4">
                                                <div className='text-sm text-muted-foreground'>
                                                    Submitted by: <span className="font-semibold text-foreground">{item.submitted_by ? getUserName(item.submitted_by) : (item.created_by ? getUserName(item.created_by) : 'N/A')}</span>
                                                </div>

                                                {item.request_message && (
                                                    <div className="p-3 rounded-md bg-background border">
                                                        <p className="text-sm font-semibold mb-1">User's Message:</p>
                                                        <p className="text-sm text-muted-foreground italic">"{item.request_message}"</p>
                                                    </div>
                                                )}

                                                {renderItemDetails(item)}

                                                <div className="flex justify-end gap-2 pt-4 border-t">
                                                    <Button variant="outline" size="sm" onClick={() => handleActionClick(item, 'reject')}>
                                                        <X className="mr-2 h-4 w-4" /> Reject
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleActionClick(item, 'approve')}>
                                                        <Check className="mr-2 h-4 w-4" /> Approve
                                                    </Button>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="flex flex-col items-center justify-center py-20 border-dashed">
                        <Check className="h-16 w-16 text-muted-foreground" />
                        <h3 className="mt-4 text-base font-bold tracking-tight">All Caught Up!</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            There are no pending approval requests.
                        </p>
                    </Card>
                )}
            </div>

            <Dialog open={isDialog} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm {approvalAction === 'approve' ? 'Approval' : 'Rejection'}</DialogTitle>
                        <DialogDescription>
                            You are about to {approvalAction} this change. This action can be reviewed later.
                        </DialogDescription>
                    </DialogHeader>
                    {showRemarksForRejection && (
                        <div className="py-4">
                            <Label htmlFor="remarks">Remarks (Required for rejection)</Label>
                            <Textarea
                                id="remarks"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder={`Add any comments for the user...`}
                                className="mt-2"
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleConfirmAction} disabled={showRemarksForRejection && !remarks}>
                            Confirm {approvalAction === 'approve' ? 'Approval' : 'Rejection'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
