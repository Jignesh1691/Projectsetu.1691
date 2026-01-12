
'use client';

import React, { useState } from 'react';
import { useAppState } from '@/hooks/use-store';
import type { Recordable } from '@/lib/definitions';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from './ui/button';
import { Pencil, Trash2, CheckCircle, Lock, MoreVertical, View, MessageSquare } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { convertRecordable, deleteRecordable } from '@/lib/store';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface RecordsTableProps {
  recordables: Recordable[];
  onEdit?: (record: Recordable) => void;
  onView?: (record: Recordable) => void;
}

const REJECTION_LIMIT = 3;

export function RecordsTable({ recordables, onEdit, onView }: RecordsTableProps) {
  const { projects, ledgers, currentUser } = useAppState();
  const { toast } = useToast();
  const [recordToConvert, setRecordToConvert] = useState<Recordable | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<Recordable | null>(null);
  const [requestMessage, setRequestMessage] = useState('');

  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name || 'N/A';
  const getLedgerName = (id: string) => ledgers.find((l) => l.id === id)?.name || 'N/A';

  const handleDeleteClick = (record: Recordable) => {
    setRecordToDelete(record);
    setRequestMessage('');
  }


  const handleDeleteConfirm = async () => {
    if (!recordToDelete || !currentUser) return;
    await deleteRecordable(recordToDelete.id, currentUser, requestMessage);
    toast({
      title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
      description: currentUser.role === 'admin' ? 'Record has been deleted.' : 'Deletion request has been submitted for approval.',
    });
    setRecordToDelete(null);
  };

  const handleConvertClick = (record: Recordable) => {
    setRecordToConvert(record);
  };

  const handleConfirmConversion = async () => {
    if (recordToConvert) {
      await convertRecordable(recordToConvert);
      toast({
        title: 'Success!',
        description: `Record converted to a transaction.`,
      });
      setRecordToConvert(null);
    }
  };

  const getStatusBadge = (status?: 'approved' | 'pending-create' | 'pending-edit' | 'pending-delete' | 'rejected', remarks?: string) => {
    switch (status) {
      case 'pending-create':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Pending Create</Badge>;
      case 'pending-edit':
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Pending Edit</Badge>;
      case 'pending-delete':
        return <Badge variant="destructive">Pending Delete</Badge>;
      case 'rejected':
        if (remarks) {
          return (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="cursor-help bg-red-100 text-red-800 border-red-200 hover:bg-red-200"><MessageSquare className="h-3 w-3 mr-1" /> Rejected</Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-xs"><p>{remarks}</p></TooltipContent>
            </Tooltip>
          );
        }
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return null;
    }
  };

  if (recordables.length === 0) {
    return (
      <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
        <p>No outstanding records found for the selected filters.</p>
      </div>
    )
  }


  return (
    <TooltipProvider>
      {/* Mobile View */}
      <div className="md:hidden">
        {recordables.map((record) => {
          const isPending = record.approval_status && record.approval_status !== 'approved';
          const isLocked = (record.rejection_count || 0) >= REJECTION_LIMIT && currentUser?.role !== 'admin';

          return (
            <Card key={record.id} className={cn("border-x-0 border-t-0 rounded-none first:border-t", isPending && "bg-muted/50")}>
              <CardContent className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{record.description}</p>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span>Due: {new Date(record.due_date).toLocaleDateString()}</span>
                      <span className="text-muted-foreground/50">|</span>
                      <span className="truncate">{getProjectName(record.project_id)}</span>
                    </div>
                    {isPending && (
                      <div className="mt-1">{getStatusBadge(record.approval_status)}</div>
                    )}
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <p className={cn('font-bold', record.type === 'asset' ? 'text-green-600' : 'text-red-600')}>{formatCurrency(record.amount)}</p>
                    {onEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && <DropdownMenuItem onClick={() => onView(record)}><View className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>}
                          {record.status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleConvertClick(record)} disabled={isPending}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Mark Paid
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onEdit(record)} disabled={isLocked || record.status === 'paid' || isPending}>
                            {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />} Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" disabled={isLocked || isPending} onClick={() => handleDeleteClick(record)}>
                            {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Desktop View */}
      <div className='hidden md:block'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Due Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Entry By</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Ledger</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recordables.map((record) => {
              const isPending = record.approval_status && record.approval_status !== 'approved';
              const isLocked = (record.rejection_count || 0) >= REJECTION_LIMIT && currentUser?.role !== 'admin';
              return (
                <TableRow key={record.id} className={cn(isPending && "bg-muted/50")}>
                  <TableCell>{new Date(record.due_date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">
                    {record.description}
                    {isPending && <div className="text-xs text-muted-foreground pt-1">{getStatusBadge(record.approval_status)}</div>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.creator?.name || record.creator?.email || 'Unknown'}
                  </TableCell>
                  <TableCell>{getProjectName(record.project_id)}</TableCell>
                  <TableCell>{getLedgerName(record.ledger_id)}</TableCell>
                  <TableCell>
                    <Badge variant={record.type === 'asset' ? 'default' : 'secondary'} className={cn(record.type === 'asset' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800', 'border-none capitalize')}>{record.type === 'asset' ? 'Receivable' : 'Payable'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={record.status === 'paid' ? 'outline' : 'secondary'} className="capitalize">{record.status}</Badge>
                  </TableCell>
                  <TableCell className={cn("text-right font-bold", record.type === 'asset' ? 'text-green-600' : 'text-red-600')}>{formatCurrency(record.amount)}</TableCell>
                  <TableCell className="text-right">
                    {onEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && <DropdownMenuItem onClick={() => onView(record)}><View className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>}
                          {record.status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleConvertClick(record)} disabled={isPending}>
                              <CheckCircle className="mr-2 h-4 w-4" /> Mark Paid
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => onEdit(record)} disabled={isLocked || record.status === 'paid' || isPending}>
                            {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />} Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" disabled={isLocked || isPending} onClick={() => handleDeleteClick(record)}>
                            {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>


      <AlertDialog open={!!recordToConvert} onOpenChange={() => setRecordToConvert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the record as paid and create a new transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 rounded-md border p-4">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full",
                recordToConvert?.type === 'asset' ? 'bg-green-100' : 'bg-red-100'
              )}>
                {recordToConvert?.type === 'asset' ?
                  <span className="text-xl font-bold text-green-600">↓</span> :
                  <span className="text-xl font-bold text-red-600">↑</span>}
              </div>
              <div>
                <p className="font-semibold">{recordToConvert?.description}</p>
                <p className={cn(
                  "font-bold",
                  recordToConvert?.type === 'asset' ? 'text-green-600' : 'text-red-600'
                )}>{formatCurrency(recordToConvert?.amount || 0)}</p>
              </div>
            </div>
            <p>A new transaction will be created in the <strong>{getLedgerName(recordToConvert?.ledger_id || '')}</strong> ledger.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmConversion}>Confirm Conversion</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!recordToDelete} onOpenChange={() => setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {currentUser?.role === 'admin'
                ? 'This action cannot be undone. This will permanently delete this record.'
                : 'This will submit a deletion request. If you want, you can provide a message to the admin.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {currentUser?.role !== 'admin' && (
            <div className="py-4 space-y-2">
              <Label htmlFor="request_message">Message for Admin (Optional)</Label>
              <Textarea
                id="request_message"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="e.g. This was created in error."
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {currentUser?.role === 'admin' ? 'Delete' : 'Submit Deletion Request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
