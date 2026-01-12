"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowRightLeft, Plus, FolderKanban, Settings, PlusCircle, ReceiptText, ArrowUpCircle, ArrowDownCircle, ClipboardList, Camera, FileText, BookOpen, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGlobalForms } from '@/components/global-forms-provider';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppState } from '@/hooks/use-store';
import { useSidebar } from '@/components/ui/sidebar';

export function BottomNav() {
    const pathname = usePathname();
    const {
        setQuickEntryOpen, setTransactionOpen, setRecordOpen,
        setStockInOpen, setStockOutOpen, setTaskOpen,
        setPhotoOpen, setDocumentOpen, setProjectOpen,
        setLedgerOpen, setMaterialOpen
    } = useGlobalForms();
    const { appUser } = useAppState();
    const { isOpen } = useSidebar();
    const isAdmin = appUser?.role?.toLowerCase() === 'admin';

    // Hide bottom nav when sidebar is open to avoid overlap and confusion
    if (isOpen) return null;

    const navItems = [
        { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/transactions', label: 'History', icon: ArrowRightLeft },
        { label: 'Add', icon: Plus, isAction: true },
        { href: '/projects', label: 'Projects', icon: FolderKanban },
        { href: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] flex justify-center pointer-events-none">
            <nav className="flex items-center justify-between w-full px-6 py-3 bg-background/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] pointer-events-auto relative overflow-visible">
                {/* Subtle Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-none" />

                {navItems.map((item, index) => {
                    const isActive = pathname === item.href;
                    const isCenter = item.isAction;

                    if (isCenter) {
                        return (
                            <DropdownMenu key="action">
                                <DropdownMenuTrigger asChild>
                                    <button className="relative -top-6 flex flex-col items-center group outline-none">
                                        <div className="w-14 h-14 bg-gradient-to-br from-primary via-primary to-orange-600 rounded-full flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(var(--primary),0.5)] border-4 border-background group-hover:scale-110 group-active:scale-95 transition-all duration-300 ring-2 ring-primary/20">
                                            <Plus className="w-7 h-7 text-white stroke-[3px]" />
                                        </div>
                                        <span className="text-[10px] font-bold text-primary mt-1 absolute -bottom-5">ADD</span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" side="top" className="w-60 mb-2 bg-card/95 backdrop-blur-xl border-white/10 shadow-2xl rounded-2xl p-2 z-[110]">
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className="text-xs text-muted-foreground/50 uppercase tracking-widest px-2 py-1.5">Financial</DropdownMenuLabel>
                                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-primary/10 focus:text-primary" onSelect={() => setQuickEntryOpen(true)}>
                                            <PlusCircle className="mr-3 h-4 w-4" /> <span className="font-medium text-sm">Multi-Entry Form</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-primary/10 focus:text-primary" onSelect={() => setTransactionOpen(true)}>
                                            <ArrowRightLeft className="mr-3 h-4 w-4" /> <span className="font-medium text-sm">New Transaction</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-primary/10 focus:text-primary" onSelect={() => setRecordOpen(true)}>
                                            <ReceiptText className="mr-3 h-4 w-4" /> <span className="font-medium text-sm">New Outstanding</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator className="bg-white/5 my-1.5" />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className="text-xs text-muted-foreground/50 uppercase tracking-widest px-2 py-1.5">Operations</DropdownMenuLabel>
                                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-primary/10 focus:text-primary" onSelect={() => setStockInOpen(true)}>
                                            <ArrowUpCircle className="mr-3 h-4 w-4" /> <span className="font-medium text-sm">Stock In</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-primary/10 focus:text-primary" onSelect={() => setStockOutOpen(true)}>
                                            <ArrowDownCircle className="mr-3 h-4 w-4" /> <span className="font-medium text-sm">Stock Out</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-primary/10 focus:text-primary" onSelect={() => setTaskOpen(true)}>
                                            <ClipboardList className="mr-3 h-4 w-4" /> <span className="font-medium text-sm">New Task</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                    <DropdownMenuSeparator className="bg-white/5 my-1.5" />
                                    <DropdownMenuGroup>
                                        <DropdownMenuLabel className="text-xs text-muted-foreground/50 uppercase tracking-widest px-2 py-1.5">General</DropdownMenuLabel>
                                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-primary/10 focus:text-primary" onSelect={() => setPhotoOpen(true)}>
                                            <Camera className="mr-3 h-4 w-4" /> <span className="font-medium text-sm">Add Site Photo</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-primary/10 focus:text-primary" onSelect={() => setDocumentOpen(true)}>
                                            <FileText className="mr-3 h-4 w-4" /> <span className="font-medium text-sm">Add Document</span>
                                        </DropdownMenuItem>
                                        {isAdmin && (
                                            <DropdownMenuItem className="rounded-lg py-2 focus:bg-primary/10 focus:text-primary" onSelect={() => setProjectOpen(true)}>
                                                <FolderKanban className="mr-3 h-4 w-4" /> <span className="font-medium text-sm">New Project</span>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-primary/10 focus:text-primary" onSelect={() => setLedgerOpen(true)}>
                                            <BookOpen className="mr-3 h-4 w-4" /> <span className="font-medium text-sm">New Ledger</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="rounded-lg py-2 focus:bg-primary/10 focus:text-primary" onSelect={() => setMaterialOpen(true)}>
                                            <Layers className="mr-3 h-4 w-4" /> <span className="font-medium text-sm">New Material</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href!}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-all duration-300 relative group",
                                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <div className={cn(
                                "p-1 rounded-xl transition-all duration-300",
                                isActive && "bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.1)]"
                            )}>
                                <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                            </div>
                            <span className={cn(
                                "text-[9px] font-bold uppercase tracking-wider transition-all duration-300",
                                isActive ? "opacity-100" : "opacity-60"
                            )}>
                                {item.label}
                            </span>

                            {isActive && (
                                <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                            )}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
