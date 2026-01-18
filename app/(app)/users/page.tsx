'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreVertical, Pencil, Trash2, CheckCircle, XCircle, UserCog, Send, Mail } from 'lucide-react';
import { useAppState } from '@/hooks/use-store';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserForm } from '@/components/user-form';
import { User } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { InviteUserForm } from '@/components/invite-user-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';

type Membership = {
  id: string;
  role: 'admin' | 'user';
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    image?: string | null;
    assignedProjects?: string[];
  };
  canViewFinances: boolean;
  canViewOperations: boolean;
  canCreateEntries: boolean;
}
type Invitation = {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
}

export default function UsersPage() {
  const { appUser } = useAppState();
  const { toast } = useToast();
  const [isInviteFormOpen, setInviteFormOpen] = useState(false);
  const [isEditFormOpen, setEditFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Membership | null>(null);

  const [members, setMembers] = useState<Membership[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/invites')
      ]);

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setMembers(membersData);
      } else {
        console.error("Failed to fetch members");
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setInvitations(invitesData);
      } else {
        console.error("Failed to fetch invites");
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load user data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/invites?id=${invitationId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to revoke invitation");
      }

      toast({
        title: "Invitation Revoked",
        description: "The invitation has been successfully revoked."
      });

      // Optimistic update or refresh
      setInvitations(invitations.filter(inv => inv.id !== invitationId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await fetch(`/api/users?id=${memberId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to remove member");
      }

      toast({
        title: "Member Removed",
        description: "The user has been removed from the organization."
      });

      // Optimistic update or refresh
      setMembers(members.filter(mem => mem.id !== memberId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  }


  if (appUser?.role !== 'admin') {
    return (
      <Card className="flex flex-col items-center justify-center py-20 border-dashed">
        <UserCog className="h-16 w-16 text-muted-foreground" />
        <CardHeader className="text-center">
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to manage users.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage your organization&apos;s members and pending invitations.</p>
        </div>
        <Button onClick={() => setInviteFormOpen(true)} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
          <Send className="mr-2 h-4 w-4" />
          Invite New User
        </Button>
      </div>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl h-12">
          <TabsTrigger value="members" className="rounded-lg px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">Current Members</TabsTrigger>
          <TabsTrigger value="invitations" className="rounded-lg px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">Pending Invitations</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="animate-in fade-in-50 duration-500">
          <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-6 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-base font-bold">Organization Members</CardTitle>
              <CardDescription>Users who have accepted an invitation and joined your workspace.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Name</TableHead>
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Email</TableHead>
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Role</TableHead>
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status</TableHead>
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Loading members...</TableCell></TableRow>
                  ) : members.length > 0 ? members.map((member) => (
                    <TableRow key={member.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="px-6 py-4 font-medium flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{member.user.name ? member.user.name.charAt(0) : 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="text-foreground">{member.user.name}</span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground">{member.user.email}</TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className={cn("capitalize rounded-lg px-2.5 py-0.5 font-medium", member.role === 'admin' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{member.role}</Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant={member.user.isActive ? 'outline' : 'destructive'} className={cn("capitalize text-[10px] px-2 py-0 border-0", member.user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
                          {member.user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all" onClick={() => { setEditingMember(member); setEditFormOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive group transition-all" onClick={() => handleRemoveMember(member.id)} disabled={member.user.id === appUser?.id}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Mail className="h-8 w-8 text-muted-foreground/30" />
                          <p className="text-muted-foreground font-medium">No members identified yet.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="invitations" className="animate-in fade-in-50 duration-500">
          <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-6 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-base font-bold">Pending Invitations</CardTitle>
              <CardDescription>Active invitations sent to team members who haven&apos;t accepted yet.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10 hover:bg-muted/10">
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Name</TableHead>
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Email Address</TableHead>
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Assigned Role</TableHead>
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground">Status / Expiry</TableHead>
                    <TableHead className="px-6 font-bold uppercase text-[10px] tracking-widest text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">Loading invitations...</TableCell></TableRow>
                  ) : invitations.length > 0 ? invitations.map((invite) => (
                    <TableRow key={invite.id} className="hover:bg-muted/5 transition-colors">
                      <TableCell className="px-6 py-4 font-medium text-foreground">{invite.name || '-'}</TableCell>
                      <TableCell className="px-6 py-4 text-muted-foreground">{invite.email}</TableCell>
                      <TableCell className="px-6 py-4"><Badge variant="secondary" className="capitalize rounded-lg bg-muted text-muted-foreground">{invite.role}</Badge></TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant={invite.status === 'pending' ? 'outline' : 'destructive'} className={cn("capitalize w-fit text-[11px] font-bold px-2 py-0 border-0",
                            invite.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                            {invite.status}
                          </Badge>
                          {invite.status === 'pending' && <span className="text-[10px] text-muted-foreground font-medium">Expires {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all" onClick={() => handleRevokeInvitation(invite.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Send className="h-8 w-8 text-muted-foreground/30" />
                          <p className="text-muted-foreground font-medium">No pending invitations.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


      <Dialog open={isInviteFormOpen} onOpenChange={setInviteFormOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a New User</DialogTitle>
            <DialogDescription>
              Enter the email address and assign a role. They will receive an invitation to join your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <InviteUserForm setOpen={setInviteFormOpen} onSuccess={() => { fetchData(); }} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditFormOpen} onOpenChange={setEditFormOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update member role, status, and project assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {editingMember && (
              <UserForm
                setOpen={setEditFormOpen}
                user={{
                  ...editingMember.user,
                  role: editingMember.role as 'admin' | 'user',
                  id: editingMember.id,
                  canViewFinances: editingMember.canViewFinances,
                  canViewOperations: editingMember.canViewOperations,
                  canCreateEntries: editingMember.canCreateEntries
                } as any}
                onSuccess={() => fetchData()}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
