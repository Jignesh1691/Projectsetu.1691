
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Button } from './ui/button';
import { Search, FolderKanban, BookOpen, ArrowRightLeft, ReceiptText, Layers, ClipboardList, Users, FileText, Camera } from 'lucide-react';
import { useAppState } from '@/hooks/use-store';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { useSidebar } from './ui/sidebar';
import { DialogTitle, DialogDescription } from './ui/dialog';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const { isMobile } = useSidebar();
  const {
    projects,
    ledgers,
    transactions,
    recordables,
    materials,
    tasks,
    labors,
    documents,
    photos,
  } = useAppState();
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  const runCommand = useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'N/A';

  const searchConfig = [
    {
        heading: 'Projects',
        icon: FolderKanban,
        items: projects,
        getPath: (item: any) => `/projects`,
        getTitle: (item: any) => item.name
    },
    {
        heading: 'Ledgers',
        icon: BookOpen,
        items: ledgers,
        getPath: (item: any) => `/ledgers`,
        getTitle: (item: any) => item.name
    },
     {
        heading: 'Transactions',
        icon: ArrowRightLeft,
        items: transactions,
        getPath: (item: any) => `/transactions`,
        getTitle: (item: any) => `${item.description} (${formatCurrency(item.amount)})`
    },
    {
        heading: 'Outstandings',
        icon: ReceiptText,
        items: recordables,
        getPath: (item: any) => `/records`,
        getTitle: (item: any) => `${item.description} (${formatCurrency(item.amount)})`
    },
    {
        heading: 'Materials',
        icon: Layers,
        items: materials,
        getPath: (item: any) => `/materials`,
        getTitle: (item: any) => `${item.name} (${item.unit})`
    },
    {
        heading: 'Tasks',
        icon: ClipboardList,
        items: tasks,
        getPath: (item: any) => `/tasks`,
        getTitle: (item: any) => item.title
    },
    {
        heading: 'Labors',
        icon: Users,
        items: labors,
        getPath: (item: any) => `/hajari`,
        getTitle: (item: any) => item.name
    },
    {
        heading: 'Documents',
        icon: FileText,
        items: documents,
        getPath: (item: any) => `/documents`,
        getTitle: (item: any) => item.document_name
    },
    {
        heading: 'Photos',
        icon: Camera,
        items: photos,
        getPath: (item: any) => `/gallery`,
        getTitle: (item: any) => `${item.description} in ${getProjectName(item.project_id)}`
    }
  ];

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <DialogTitle className="sr-only">Global Search</DialogTitle>
        <DialogDescription className="sr-only">Use this dialog to search for items across the application.</DialogDescription>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {searchConfig.map(group => (
            <CommandGroup key={group.heading} heading={group.heading}>
                {group.items.map(item => {
                    const Icon = group.icon;
                    return (
                        <CommandItem
                            key={item.id}
                            value={`${group.heading}-${item.id}-${group.getTitle(item)}`}
                            onSelect={() => runCommand(() => router.push(group.getPath(item)))}
                        >
                            <Icon className="mr-2 h-4 w-4" />
                            <span>{group.getTitle(item)}</span>
                        </CommandItem>
                    )
                })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
