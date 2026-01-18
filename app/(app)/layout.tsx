
'use client';

import React, { useState, useMemo } from 'react';
import { AppLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Bell, ArrowRightLeft, ReceiptText, FolderKanban, BookOpen, ClipboardList, FileText, Camera, LayoutDashboard, UserCog, Users, BookText, Settings, BellRing, Layers, LogOut, Scale, ScrollText, ShieldAlert, ChevronLeft, Coins, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { QuickEntryForm } from '@/components/quick-entry-form';
import { TransactionForm } from '@/components/transaction-form';
import { RecordForm } from '@/components/record-form';
import { ProjectForm } from '@/components/project-form';
import { LedgerForm } from '@/components/ledger-form';
import { TaskForm } from '@/components/task-form';
import { DocumentForm } from '@/components/document-form';
import { PhotoForm } from '@/components/photo-form';
import { SidebarProvider, useSidebar, Sidebar, SidebarHeader, SidebarBody, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarTrigger } from '@/components/ui/sidebar';
import { useAppState } from '@/hooks/use-store';
import { MaterialFormsProvider, useMaterialForms } from '@/components/material-forms-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ChangePasswordForm } from '@/components/change-password-form';
import { cn } from '@/lib/utils';
import { GlobalSearch } from '@/components/global-search';
import { Plus, PlusCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { GlobalFormsProvider, useGlobalForms } from '@/components/global-forms-provider';
import { BottomNav } from '@/components/bottom-nav';
import { PullToRefresh } from '@/components/pull-to-refresh';


interface NavItem {
  href?: string;
  label: string;
  icon: any;
  hide?: boolean;
  id?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
  hide?: boolean;
}

const getNavGroups = (role?: string, canSeeFinances: boolean = true, canSeeOperations: boolean = true): NavGroup[] => {
  const isAdmin = role?.toLowerCase() === 'admin';
  return [
    {
      title: 'Main',
      items: [
        { href: isAdmin ? '/admin' : '/app', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/projects', label: 'Projects', icon: FolderKanban },
        { href: '/ledgers', label: 'Ledgers', icon: BookOpen, hide: !canSeeFinances },
        { href: '/transactions', label: 'Transactions', icon: ArrowRightLeft, hide: !canSeeFinances },
        { href: '/records', label: 'Outstandings', icon: ReceiptText, hide: !canSeeFinances },
        { href: '/cash-bank-book', label: 'Cash/Bank Book', icon: BookText, hide: !canSeeFinances },
        { href: '/journal', label: 'Journal', icon: ScrollText, hide: !canSeeFinances },
      ]
    },
    {
      title: 'Operations',
      items: [
        { href: '/materials', label: 'Materials', icon: Layers, hide: !canSeeOperations },
        { href: '/tasks', label: 'Tasks', icon: ClipboardList, hide: !canSeeOperations },
        { href: '/hajari', label: 'Hajari', icon: Users, hide: !canSeeOperations },
        { href: '/petty-cash', label: 'Petty Cash', icon: Coins, hide: isAdmin },
        { href: '/documents', label: 'Documents', icon: FileText, hide: !canSeeOperations },
        { href: '/gallery', label: 'Site Photos', icon: Camera, hide: !canSeeOperations },
      ]
    },
    {
      title: 'Admin',
      adminOnly: true,
      items: [
        { href: '/users', label: 'Users', icon: UserCog },
        { href: '/approvals', label: 'Approvals', icon: BellRing, hide: true }, // hide from sidebar
        { href: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldAlert },
      ]
    },
  ];
};

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const {
    isTransactionOpen, setTransactionOpen,
    isRecordOpen, setRecordOpen,
    isProjectOpen, setProjectOpen,
    isLedgerOpen, setLedgerOpen,
    isTaskOpen, setTaskOpen,
    isDocumentOpen, setDocumentOpen,
    isPhotoOpen, setPhotoOpen,
    isQuickEntryOpen, setQuickEntryOpen,
    isPasswordChangeOpen, setPasswordChangeOpen,
    setMaterialOpen, setStockInOpen, setStockOutOpen
  } = useGlobalForms();

  const { notifications, appUser, transactions, recordables, tasks, photos, documents, hajari_records, materials, material_ledger, isLoaded, project_users } = useAppState();
  const pathname = usePathname();
  const isAdmin = appUser?.role?.toLowerCase() === 'admin';
  const { isMobile, setIsOpen } = useSidebar();
  const router = useRouter();

  const canSeeFinances = useMemo(() => {
    if (isAdmin) return true;
    return appUser?.canViewFinances !== false;
  }, [isAdmin, appUser]);

  const canCreateAnyEntry = useMemo(() => {
    if (isAdmin) return true;
    return appUser?.canCreateEntries !== false;
  }, [isAdmin, appUser]);

  const canSeeOperations = useMemo(() => {
    if (isAdmin) return true;
    return appUser?.canViewOperations !== false;
  }, [isAdmin, appUser]);


  const canAddProjectOrLedger = appUser?.role === 'admin';

  const unreadNotificationsCount = useMemo(() => {
    if (!appUser) return 0;
    return notifications.filter(n => n.user_id === appUser.id && !n.is_read).length;
  }, [notifications, appUser]);

  const pendingApprovalsCount = useMemo(() => {
    if (appUser?.role !== 'admin') return 0;
    const allItems = [
      ...transactions,
      ...recordables,
      ...tasks,
      ...photos,
      ...documents,
      ...hajari_records,
      ...materials,
      ...material_ledger,
    ];
    return allItems.filter(item =>
      item.approval_status === 'pending-edit' ||
      item.approval_status === 'pending-delete' ||
      item.approval_status === 'pending-create'
    ).length;
  }, [appUser, transactions, recordables, tasks, photos, documents, hajari_records, materials, material_ledger]);

  const mobileNavItems: NavItem[] = [
    { href: appUser?.role === 'admin' ? '/admin' : '/app', label: 'Home', icon: LayoutDashboard },
    { href: '/transactions', label: 'History', icon: ArrowRightLeft, hide: !canSeeFinances },
    { label: 'Add', icon: PlusCircle, id: 'add' },
    { href: isAdmin ? '/admin' : '/app', label: 'Projects', icon: FolderKanban },
    { href: '/settings', label: 'Menu', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  }


  // Block rendering until critical data (Phase 1) is loaded to prevent sidebar pop-in
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Sidebar>
        <SidebarHeader className="h-14 flex items-center px-4 border-b border-sidebar-border/50">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 text-primary shadow-sm">
              <AppLogo />
            </div>
            <span className="text-xl font-bold tracking-tight text-sidebar-foreground group-data-[collapsed]:hidden">ProjectSetu</span>
          </div>
        </SidebarHeader>
        <SidebarBody>
          <SidebarMenu>
            {getNavGroups(appUser?.role, canSeeFinances, canSeeOperations).map((group: NavGroup, index: number) => {
              const isVisible = !group.adminOnly || isAdmin;
              if (!isVisible) return null;

              const visibleItems = group.items.filter((item: NavItem) => !item.hide);
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.title} className="space-y-0.5">
                  {index > 0 && <Separator className="mx-2 my-1 bg-sidebar-border/30" />}
                  <p className="px-4 py-2 text-[12px] font-bold uppercase tracking-[0.1em] text-sidebar-foreground/40 group-data-[collapsed]:hidden">
                    {group.title}
                  </p>
                  {visibleItems.map((item: NavItem) => (
                    <SidebarMenuItem
                      key={item.href}
                      href={item.href!}
                      isActive={pathname.startsWith(item.href || '')}
                      tooltip={item.label}
                      className={cn(
                        "mx-1 rounded-lg transition-all duration-200 px-2.5 py-2",
                        pathname.startsWith(item.href || '')
                          ? "bg-primary shadow-lg shadow-primary/20 text-primary-foreground font-semibold"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5", pathname.startsWith(item.href || '') ? "text-primary-foreground" : "text-primary/70")} />
                      <span className="group-data-[collapsed]:hidden text-[15px] ml-2 font-medium">{item.label}</span>
                    </SidebarMenuItem>
                  ))}
                </div>
              )
            })}
          </SidebarMenu>
        </SidebarBody>
        <SidebarFooter className="p-2">
          <div className="flex items-center justify-start gap-2 p-1 group-data-[collapsed]:-mx-2 group-data-[collapsed]:p-0 group-data-[collapsed]:flex-col group-data-[collapsed]:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="mx-1 px-2.5 py-2 h-auto flex-1 justify-start gap-2 hover:bg-sidebar-accent group-data-[collapsed]:w-full group-data-[collapsed]:aspect-square group-data-[collapsed]:justify-center">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-bold">
                      {(appUser?.name || appUser?.email)?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-bold text-[15px] group-data-[collapsed]:hidden truncate">
                    {appUser?.name || appUser?.email?.split('@')[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{appUser?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{appUser?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setPasswordChangeOpen(true)}>
                  <Scale className="mr-2 h-4 w-4" />
                  <span>Change Password</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>
        </SidebarFooter>
      </Sidebar>

      <div
        className={cn(
          "flex flex-col flex-1 min-h-screen bg-background relative transition-all duration-300 ease-in-out",
          "md:pl-[var(--sidebar-width)]"
        )}
        style={{
          "--sidebar-width": useSidebar().isCollapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width-expanded)"
        } as React.CSSProperties}
      >
        <header
          className={cn(
            "fixed top-0 right-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-4 sm:gap-4 md:px-6 transition-all duration-300 ease-in-out",
            "left-0 md:left-[var(--sidebar-width)]"
          )}
        >
          {isMobile && !['/app', '/admin', '/'].includes(pathname) ? (
            <Button
              variant="ghost"
              size="icon"
              className="mr-1 h-9 w-9"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          ) : (
            <SidebarTrigger className="md:hidden" />
          )}
          <div className="flex flex-row items-baseline gap-2 ml-1 md:ml-4 select-none mr-4">
            <h2 className="text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] text-primary/70 leading-none">{appUser?.role?.toLowerCase() === 'admin' ? 'Admin Panel' : 'User Panel'}</h2>
            <span className="text-muted-foreground/40 text-sm">/</span>
            <h1 className="text-sm md:text-base font-bold tracking-tight text-foreground leading-none">
              {appUser?.organizationName || 'ProjectSetu'}
            </h1>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {isAdmin && (
              <Link href="/approvals">
                <Button variant="ghost" size="icon" className="relative">
                  <BellRing className="h-5 w-5" />
                  <span className="sr-only">Approvals</span>
                  {isLoaded && pendingApprovalsCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary text-xs text-primary-foreground items-center justify-center">{pendingApprovalsCount}</span>
                    </span>
                  )}
                </Button>
              </Link>
            )}
            <Link href="/settings" className="hidden md:flex">
              <Button variant="ghost" size="icon" className="relative">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
            </Link>
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
                {isLoaded && unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 py-3 px-3 md:gap-4 md:p-6 pt-16 md:pt-16 pb-16 md:pb-6">
          <PullToRefresh>
            {children}
          </PullToRefresh>
        </main>

        <BottomNav />

        {/* Global Floating Action Button */}
        <div className="hidden md:block fixed bottom-6 right-6 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-110 active:scale-95 border-4 border-background">
                <Plus className="h-7 w-7" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-60 mb-2 bg-card">
              <DropdownMenuGroup>
                <div className="mb-2">
                  <DropdownMenuLabel>Financial</DropdownMenuLabel>
                  {canCreateAnyEntry && (
                    <>
                      <DropdownMenuItem onSelect={() => setQuickEntryOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Multi-Entry Form
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setTransactionOpen(true)}>
                        <ArrowRightLeft className="mr-2 h-4 w-4" /> New Transaction
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setRecordOpen(true)}>
                        <ReceiptText className="mr-2 h-4 w-4" /> New Outstanding
                      </DropdownMenuItem>
                    </>
                  )}
                  {!canCreateAnyEntry && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                      No permission to create entries
                    </div>
                  )}
                </div>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Operations</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setStockInOpen(true)}>
                  <ArrowUpCircle className="mr-2 h-4 w-4" /> Stock In
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setStockOutOpen(true)}>
                  <ArrowDownCircle className="mr-2 h-4 w-4" /> Stock Out
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setTaskOpen(true)}>
                  <ClipboardList className="mr-2 h-4 w-4" /> New Task
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>General</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => setPhotoOpen(true)}>
                  <Camera className="mr-2 h-4 w-4" /> Add Site Photo
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDocumentOpen(true)}>
                  <FileText className="mr-2 h-4 w-4" /> Add Document
                </DropdownMenuItem>
                {canAddProjectOrLedger && (
                  <DropdownMenuItem onSelect={() => setProjectOpen(true)}>
                    <FolderKanban className="mr-2 h-4 w-4" /> New Project
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => setLedgerOpen(true)}>
                  <BookOpen className="mr-2 h-4 w-4" /> New Ledger
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setMaterialOpen(true)}>
                  <Layers className="mr-2 h-4 w-4" /> New Material
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={isQuickEntryOpen} onOpenChange={setQuickEntryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quick Multi-Entry</DialogTitle>
            <DialogDescription>
              Rapidly enter multiple transactions or outstandings for a single project and date.
            </DialogDescription>
          </DialogHeader>
          <QuickEntryForm setOpen={setQuickEntryOpen} />
        </DialogContent>
      </Dialog>

      <Dialog open={isTransactionOpen} onOpenChange={setTransactionOpen}>
        <DialogContent className="w-full max-w-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a New Transaction</DialogTitle>
            <DialogDescription>
              Record a new income or expense for one of your projects.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <TransactionForm setOpen={setTransactionOpen} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRecordOpen} onOpenChange={setRecordOpen}>
        <DialogContent className="w-full max-w-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a New Outstanding</DialogTitle>
            <DialogDescription>
              Record a new payable (money out) or receivable (money in).
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <RecordForm setOpen={setRecordOpen} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isProjectOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="w-full max-w-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a New Project</DialogTitle>
            <DialogDescription>
              Add a new construction project to start tracking it.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <ProjectForm setOpen={setProjectOpen} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLedgerOpen} onOpenChange={setLedgerOpen}>
        <DialogContent className="w-full max-w-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a New Ledger</DialogTitle>
            <DialogDescription>
              Ledgers help you categorize job costs (e.g., Labor, Materials).
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <LedgerForm setOpen={setLedgerOpen} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTaskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="w-full max-w-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a New Task</DialogTitle>
            <DialogDescription>Fill out the details for your task below.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <TaskForm setOpen={setTaskOpen} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDocumentOpen} onOpenChange={setDocumentOpen}>
        <DialogContent className="w-full max-w-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Document</DialogTitle>
            <DialogDescription>Upload a file (e.g., blueprint, invoice, permit) and link it to a project.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <DocumentForm setOpen={setDocumentOpen} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPhotoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="w-full max-w-none sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a New Site Photo</DialogTitle>
            <DialogDescription>Upload an image or use your camera to capture one for a project.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <PhotoForm setOpen={setPhotoOpen} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordChangeOpen} onOpenChange={setPasswordChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Your Password</DialogTitle>
            <DialogDescription>
              For security, you must change your temporary password before you can continue.
            </DialogDescription>
          </DialogHeader>
          <ChangePasswordForm setOpen={setPasswordChangeOpen} />
        </DialogContent>
      </Dialog>
    </>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      {/* Trigger Rebuild */}
      <GlobalFormsProvider>
        <MaterialFormsProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </MaterialFormsProvider>
      </GlobalFormsProvider>
    </SidebarProvider>
  )
}
