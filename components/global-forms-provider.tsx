
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GlobalFormsContextType {
    isTransactionOpen: boolean;
    setTransactionOpen: (open: boolean) => void;
    isRecordOpen: boolean;
    setRecordOpen: (open: boolean) => void;
    isProjectOpen: boolean;
    setProjectOpen: (open: boolean) => void;
    isLedgerOpen: boolean;
    setLedgerOpen: (open: boolean) => void;
    isTaskOpen: boolean;
    setTaskOpen: (open: boolean) => void;
    isDocumentOpen: boolean;
    setDocumentOpen: (open: boolean) => void;
    isPhotoOpen: boolean;
    setPhotoOpen: (open: boolean) => void;
    isQuickEntryOpen: boolean;
    setQuickEntryOpen: (open: boolean) => void;
    isPasswordChangeOpen: boolean;
    setPasswordChangeOpen: (open: boolean) => void;

    // Material specific (merged from material-forms-provider)
    isMaterialOpen: boolean;
    setMaterialOpen: (open: boolean) => void;
    isStockInOpen: boolean;
    setStockInOpen: (open: boolean) => void;
    isStockOutOpen: boolean;
    setStockOutOpen: (open: boolean) => void;

    // Selection/Editing states
    editingItem: any | null;
    setEditingItem: (item: any | null) => void;
}

const GlobalFormsContext = createContext<GlobalFormsContextType | undefined>(undefined);

export const useGlobalForms = () => {
    const context = useContext(GlobalFormsContext);
    if (!context) {
        throw new Error('useGlobalForms must be used within a GlobalFormsProvider');
    }
    return context;
};

export const GlobalFormsProvider = ({ children }: { children: ReactNode }) => {
    const [isTransactionOpen, setTransactionOpen] = useState(false);
    const [isRecordOpen, setRecordOpen] = useState(false);
    const [isProjectOpen, setProjectOpen] = useState(false);
    const [isLedgerOpen, setLedgerOpen] = useState(false);
    const [isTaskOpen, setTaskOpen] = useState(false);
    const [isDocumentOpen, setDocumentOpen] = useState(false);
    const [isPhotoOpen, setPhotoOpen] = useState(false);
    const [isQuickEntryOpen, setQuickEntryOpen] = useState(false);
    const [isPasswordChangeOpen, setPasswordChangeOpen] = useState(false);

    const [isMaterialOpen, setMaterialOpen] = useState(false);
    const [isStockInOpen, setStockInOpen] = useState(false);
    const [isStockOutOpen, setStockOutOpen] = useState(false);

    const [editingItem, setEditingItem] = useState<any | null>(null);

    const value = {
        isTransactionOpen, setTransactionOpen,
        isRecordOpen, setRecordOpen,
        isProjectOpen, setProjectOpen,
        isLedgerOpen, setLedgerOpen,
        isTaskOpen, setTaskOpen,
        isDocumentOpen, setDocumentOpen,
        isPhotoOpen, setPhotoOpen,
        isQuickEntryOpen, setQuickEntryOpen,
        isPasswordChangeOpen, setPasswordChangeOpen,
        isMaterialOpen, setMaterialOpen,
        isStockInOpen, setStockInOpen,
        isStockOutOpen, setStockOutOpen,
        editingItem, setEditingItem
    };

    return (
        <GlobalFormsContext.Provider value={value}>
            {children}
        </GlobalFormsContext.Provider>
    );
};
