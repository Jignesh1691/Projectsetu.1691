
'use client';

import React, { useState } from 'react';
import { useAppState } from '@/hooks/use-store';
import type { Transaction } from '@/lib/definitions';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from './ui/button';
import { Pencil, Trash2, Undo, MessageSquare, Lock, View, MoreVertical } from 'lucide-react';
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
import { deleteTransaction, revertHajariTransaction, revertConvertedTransaction } from '@/lib/store';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './ui/tooltip';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface TransactionsTableProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onView?: (transaction: Transaction) => void;
}

const REJECTION_LIMIT = 3;


export function TransactionsTable({ transactions, onEdit, onView }: TransactionsTableProps) {
  const { currentUser, projects, ledgers } = useAppState();
  const { toast } = useToast();
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [transactionToRevert, setTransactionToRevert] = useState<Transaction | null>(null);
  const [requestMessage, setRequestMessage] = useState('');

  const getProjectName = (id: string) => projects.find((p) => p.id === id)?.name || 'N/A';
  const getLedgerName = (id: string) => ledgers.find((l) => l.id === id)?.name || 'N/A';

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setRequestMessage('');
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete || !currentUser) return;
    await deleteTransaction(transactionToDelete.id, currentUser, requestMessage);
    toast({
      title: currentUser.role === 'admin' ? 'Success!' : 'Request Submitted',
      description: currentUser.role === 'admin' ? 'Transaction has been deleted.' : 'Deletion request has been submitted for approval.',
    });
    setTransactionToDelete(null);
  };

  const handleRevert = async () => {
    if (!transactionToRevert || !currentUser) return;

    if (transactionToRevert.hajari_settlement_id) {
      await revertHajariTransaction(transactionToRevert, currentUser, "Reverting Hajari Settlement");
      toast({
        title: 'Revert Request Submitted',
        description: 'Request to revert Hajari settlement has been sent for approval.',
      });
    } else if (transactionToRevert.converted_from_record_id) {
      await revertConvertedTransaction(transactionToRevert);
      toast({
        title: 'Success!',
        description: 'Transaction has been reverted to an outstanding record.',
      });
    }

    setTransactionToRevert(null);
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


  if (transactions.length === 0) {
    return (
      <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
        <p>No transactions found for the selected filters.</p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      {/* Mobile View */}
      <div className="md:hidden">
        {transactions.map((transaction) => {
          const isPending = transaction.approval_status && transaction.approval_status !== 'approved' && transaction.approval_status !== 'rejected';
          const isLocked = (transaction.rejection_count || 0) >= REJECTION_LIMIT && currentUser?.role !== 'admin';

          return (
            <Card key={transaction.id} className={cn("border-x-0 border-t-0 rounded-none first:border-t", isPending && "bg-muted/50", transaction.approval_status === 'rejected' && 'bg-red-50 dark:bg-red-900/20')}>
              <CardContent className="p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{transaction.description}</p>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      <span>{new Date(transaction.date).toLocaleDateString()}</span>
                      <span className="text-muted-foreground/50">|</span>
                      <span className="truncate">{getProjectName(transaction.project_id)}</span>
                    </div>
                    {(isPending || transaction.approval_status === 'rejected') && (
                      <div className="mt-1">
                        {getStatusBadge(transaction.approval_status, transaction.remarks)}
                      </div>
                    )}
                  </div>
                  <div className={cn('text-right flex items-center gap-2')}>
                    <p className={cn('font-bold', transaction.type === 'income' ? 'text-green-600' : 'text-red-600')}>{formatCurrency(transaction.amount)}</p>
                    {onEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && <DropdownMenuItem onClick={() => onView(transaction)}><View className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>}
                          {transaction.converted_from_record_id || transaction.hajari_settlement_id ? (
                            <DropdownMenuItem onClick={() => setTransactionToRevert(transaction)}>
                              <Undo className="mr-2 h-4 w-4" /> Revert
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => onEdit(transaction)} disabled={isPending || isLocked}>
                                {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />} Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" disabled={isPending || isLocked} onClick={() => handleDeleteClick(transaction)}>
                                {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
                              </DropdownMenuItem>
                            </>
                          )}
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
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Ledger</TableHead>
              <TableHead>Entry By</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const isPending = transaction.approval_status && transaction.approval_status !== 'approved' && transaction.approval_status !== 'rejected';
              const isLocked = (transaction.rejection_count || 0) >= REJECTION_LIMIT && currentUser?.role !== 'admin';
              return (
                <TableRow key={transaction.id} className={cn(isPending && "bg-muted/50", transaction.approval_status === 'rejected' && 'bg-red-50 dark:bg-red-900/20')}>
                  <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">
                    {transaction.description}
                    {(isPending || transaction.approval_status === 'rejected') && (
                      <div className="text-xs text-muted-foreground pt-1">{getStatusBadge(transaction.approval_status, transaction.remarks)}</div>
                    )}
                  </TableCell>
                  <TableCell>{getProjectName(transaction.project_id)}</TableCell>
                  <TableCell>{getLedgerName(transaction.ledger_id)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.creator?.name || transaction.creator?.email || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className={cn(transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800', 'border-none capitalize')}>{transaction.type}</Badge>
                  </TableCell>
                  <TableCell className={cn('text-right font-semibold', transaction.type === 'income' ? 'text-green-600' : 'text-red-600')}>{formatCurrency(transaction.amount)}</TableCell>
                  <TableCell className="text-right">
                    {onEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && <DropdownMenuItem onClick={() => onView(transaction)}><View className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>}
                          {transaction.converted_from_record_id || transaction.hajari_settlement_id ? (
                            <DropdownMenuItem onClick={() => setTransactionToRevert(transaction)}>
                              <Undo className="mr-2 h-4 w-4" /> Revert
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => onEdit(transaction)} disabled={isPending || isLocked}>
                                {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />} Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" disabled={isPending || isLocked} onClick={() => handleDeleteClick(transaction)}>
                                {isLocked ? <Lock className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
                              </DropdownMenuItem>
                            </>
                          )}
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

      <AlertDialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {currentUser?.role === 'admin'
                ? 'This action cannot be undone. This will permanently delete this transaction.'
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
                placeholder="e.g. This was a duplicate entry."
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
      <AlertDialog open={!!transactionToRevert} onOpenChange={() => setTransactionToRevert(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will {transactionToRevert?.hajari_settlement_id ? 'submit a revert request to the admin.' : 'delete this transaction and change the original outstanding record\'s status back to "pending".'} This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevert}>
              {transactionToRevert?.hajari_settlement_id ? 'Submit Revert Request' : 'Revert'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

