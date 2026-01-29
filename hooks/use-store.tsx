
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
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
  FinancialAccount,
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
  financial_accounts: FinancialAccount[];
  appUser: User | null; // This will be the user profile from our DB
  currentUser: User | null; // Alias for appUser to support legacy components
  userVisibleProjects: Project[];
  setState: React.Dispatch<React.SetStateAction<Omit<AppState, 'setState' | 'appUser' | 'currentUser' | 'userVisibleProjects' | 'isLoaded'>>>;
  isLoaded: boolean;
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
  const [state, setState] = useState<Omit<AppState, 'setState' | 'appUser' | 'currentUser' | 'userVisibleProjects' | 'isLoaded'>>(defaultState as any);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    initializeStore(setState as any);
    setIsLoaded(true);
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
    const matchedUser = state?.users?.find((u: any) => u.email?.toLowerCase() === session.user?.email?.toLowerCase());

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
    if (userRole === 'admin') {
      return state.projects;
    }
    const userProjectIds = state.project_users.filter((pu: any) => pu.user_id === appUser.id).map((pu: any) => pu.project_id);
    return state.projects.filter(p => userProjectIds.includes(p.id));
  }, [appUser, state]);


  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 animate-spin text-primary"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
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
    setState,
    isLoaded,
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
