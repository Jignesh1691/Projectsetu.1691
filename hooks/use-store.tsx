
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import type {
  Project,
  Ledger,
  Transaction,
  Recordable,
  Photo,
  Document as AppDocument,
  Task,
  Labor,
  Hajari,
  ProjectUser,
  Notification,
  ApprovalStatus,
  PaymentMode,
  Material,
  MaterialLedgerEntry,
  User,
  JournalEntry,
} from '@/lib/definitions';
import { defaultState } from '@/lib/default-state';
import { initializeStore } from '@/lib/store';

const LOCAL_STORAGE_KEY = 'ledgerlink_app_state';

// This combines the store's state with auth state
export interface AppState {
  users: any[]; // This will be replaced by Supabase users
  projects: Project[];
  project_users: ProjectUser[];
  ledgers: Ledger[];
  transactions: Transaction[];
  recordables: Recordable[];
  photos: Photo[];
  documents: AppDocument[];
  labors: Labor[];
  hajari_records: Hajari[];
  tasks: Task[];
  notifications: Notification[];
  materials: Material[];
  material_ledger: MaterialLedgerEntry[];
  journal_entries: JournalEntry[];
  appUser: User | null; // This will be the user profile from our DB
  currentUser: User | null; // Alias for appUser to support legacy components
  userVisibleProjects: Project[];
  userFinanceVisibleProjects: Project[];
  userEntryAllowedProjects: Project[];
  setState: React.Dispatch<React.SetStateAction<Omit<AppState, 'setState' | 'appUser' | 'currentUser' | 'userVisibleProjects' | 'userFinanceVisibleProjects' | 'userEntryAllowedProjects' | 'isLoaded'>>>;
  isLoaded: boolean;
  records_loaded: boolean;
  transactions_loaded: boolean;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

const getInitialState = () => {
  if (typeof window === 'undefined') {
    return defaultState;
  }
  try {
    const item = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    // We will ignore localStorage state for now to ensure a clean start with Supabase data
    return defaultState;
  } catch (error) {
    console.error("Error reading from localStorage", error);
    return defaultState;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [state, setState] = useState<Omit<AppState, 'setState' | 'appUser' | 'currentUser' | 'userVisibleProjects' | 'userFinanceVisibleProjects' | 'userEntryAllowedProjects' | 'isLoaded'>>(defaultState as any);

  useEffect(() => {
    initializeStore(setState as any);
  }, []);

  useEffect(() => {
    if (!state) {
      setState(defaultState as any);
    }
  }, [state]);

  // This will become the user profile from our public.AppUser table
  const appUser = useMemo(() => {
    if (!session?.user) return null;

    // Check if user exists in our local store list
    const matchedUser = state?.users?.find((u: any) => u.email.toLowerCase() === session.user?.email?.toLowerCase());

    // Always prioritize the session's role and organizationId which come from the real DB
    return {
      ...(matchedUser || {}),
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: (session.user.role?.toLowerCase() as 'admin' | 'user') || 'user',
      organizationId: session.user.organizationId,
      organizationName: session.user.organizationName
    } as User;
  }, [session, state]);

  const currentUser = appUser;

  const userVisibleProjects = useMemo(() => {
    if (!appUser || !state) return [];
    const userRole = (appUser.role as string || '').toLowerCase();
    if (userRole === 'admin') return state.projects;
    const userProjectIds = state.project_users.filter((pu: any) => pu.user_id === appUser.id).map((pu: any) => pu.project_id);
    return state.projects.filter(p => userProjectIds.includes(p.id));
  }, [appUser, state]);

  const userFinanceVisibleProjects = useMemo(() => {
    if (!appUser || !state) return [];
    if (appUser.role === 'admin') return state.projects;
    const userProjectIds = state.project_users
      .filter((pu: any) => pu.user_id === appUser.id && pu.can_view_finances)
      .map((pu: any) => pu.project_id);
    return state.projects.filter(p => userProjectIds.includes(p.id));
  }, [appUser, state]);

  const userEntryAllowedProjects = useMemo(() => {
    if (!appUser || !state) return [];
    if (appUser.role === 'admin') return state.projects;
    const userProjectIds = state.project_users
      .filter((pu: any) => pu.user_id === appUser.id && pu.can_create_entries)
      .map((pu: any) => pu.project_id);
    return state.projects.filter(p => userProjectIds.includes(p.id));
  }, [appUser, state]);


  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  const fullState: AppState = {
    ...state,
    appUser,
    currentUser,
    userVisibleProjects,
    userFinanceVisibleProjects,
    userEntryAllowedProjects,
    setState,
    isLoaded: (state as any).isInitialized || false,
    records_loaded: (state as any).records_loaded || false,
    transactions_loaded: (state as any).transactions_loaded || false,
  };

  return (
    <AppStateContext.Provider value={fullState}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}
