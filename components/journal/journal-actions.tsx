"use client";

import { useState } from "react";
import { MoreHorizontal, Edit, Trash, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAppState } from '@/hooks/use-store';
import { JournalForm } from "./journal-form";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

export function JournalActions({ entry }: { entry: any }) {
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [requestMessage, setRequestMessage] = useState("");
    const { toast } = useToast();
    const { currentUser, setState } = useAppState();

    const isPending = entry.approvalStatus && entry.approvalStatus !== 'approved';
    const isAdmin = currentUser?.role === 'admin';

    const handleDelete = async () => {
        try {
            const url = new URL('/api/journal', window.location.origin);
            url.searchParams.append('id', entry.id);
            if (requestMessage) url.searchParams.append('message', requestMessage);

            const res = await fetch(url.toString(), {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error("Failed to delete");
            const data = await res.json();

            // Optimistic update
            setState((prev: any) => ({
                ...prev,
                journal_entries: prev.journal_entries.filter((e: any) => e.id !== entry.id)
            }));

            toast({ title: data.status === 'pending-delete' ? "Deletion Requested" : "Example Deleted" });
            setDeleteOpen(false);
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete entry", variant: "destructive" });
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        disabled={isPending}
                        onClick={() => setEditOpen(true)}
                    >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={isPending}
                        onClick={() => setDeleteOpen(true)}
                        className="text-red-600 focus:text-red-600"
                    >
                        <Trash className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    {/* Reuse JournalForm with edit mode */}
                    <JournalForm
                        mode="edit"
                        initialData={entry}
                        onSuccess={() => {
                            setEditOpen(false);
                            // Toast is handled in JournalForm
                        }}
                        onCancel={() => setEditOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Journal Entry</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this entry? This action cannot be undone.
                            {!isAdmin && " This will require admin approval."}
                        </DialogDescription>
                    </DialogHeader>
                    {!isAdmin && (
                        <div className="space-y-2">
                            <Label>Reason for deletion</Label>
                            <Textarea
                                value={requestMessage}
                                onChange={(e) => setRequestMessage(e.target.value)}
                                placeholder="Please explain why..."
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
