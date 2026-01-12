

'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MaterialForm } from '@/components/material-form';
import { MaterialStockInForm } from '@/components/material-stock-in-form';
import { MaterialStockOutForm } from '@/components/material-stock-out-form';
import type { Material, MaterialLedgerEntry } from '@/lib/definitions';

interface MaterialFormsContextType {
  isMaterialFormOpen: boolean;
  setMaterialFormOpen: (open: boolean) => void;
  editingMaterial?: Material;
  setEditingMaterial: (material?: Material) => void;
  isStockInSheetOpen: boolean;
  setStockInSheetOpen: (open: boolean) => void;
  isStockOutSheetOpen: boolean;
  setStockOutSheetOpen: (open: boolean) => void;
  editingLedgerEntry?: MaterialLedgerEntry;
  setEditingLedgerEntry: (entry?: MaterialLedgerEntry) => void;
}

const MaterialFormsContext = createContext<MaterialFormsContextType | undefined>(undefined);

export const useMaterialForms = () => {
  const context = useContext(MaterialFormsContext);
  if (!context) {
    throw new Error('useMaterialForms must be used within a MaterialFormsProvider');
  }
  return context;
};

export const MaterialFormsProvider = ({ children }: { children: ReactNode }) => {
  const [isMaterialFormOpen, setMaterialFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | undefined>();
  const [isStockInSheetOpen, setStockInSheetOpen] = useState(false);
  const [isStockOutSheetOpen, setStockOutSheetOpen] = useState(false);
  const [editingLedgerEntry, setEditingLedgerEntry] = useState<MaterialLedgerEntry | undefined>();

  const value = {
    isMaterialFormOpen,
    setMaterialFormOpen,
    editingMaterial,
    setEditingMaterial,
    isStockInSheetOpen,
    setStockInSheetOpen,
    isStockOutSheetOpen,
    setStockOutSheetOpen,
    editingLedgerEntry,
    setEditingLedgerEntry,
  };

  return (
    <MaterialFormsContext.Provider value={value}>
      {children}
      <Dialog open={isMaterialFormOpen} onOpenChange={setMaterialFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMaterial ? 'Edit' : 'Add New'} Material</DialogTitle>
            <DialogDescription>
              {editingMaterial ? 'Update the details of your material.' : 'Define a new material used in your projects.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <MaterialForm setOpen={setMaterialFormOpen} material={editingMaterial} />
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isStockInSheetOpen} onOpenChange={setStockInSheetOpen}>
        <DialogContent className="w-full max-w-md">
            <DialogHeader>
                <DialogTitle>{editingLedgerEntry ? 'Edit' : 'New'} Stock In Entry</DialogTitle>
                <DialogDescription>Record materials received at a project site.</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
                <MaterialStockInForm setOpen={setStockInSheetOpen} entry={editingLedgerEntry} />
            </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isStockOutSheetOpen} onOpenChange={setStockOutSheetOpen}>
        <DialogContent className="w-full max-w-md">
            <DialogHeader>
                <DialogTitle>{editingLedgerEntry ? 'Edit' : 'New'} Stock Out Entry</DialogTitle>
                <DialogDescription>Record materials consumed on a project.</DialogDescription>
            </DialogHeader>
             <div className="mt-4">
                <MaterialStockOutForm setOpen={setStockOutSheetOpen} entry={editingLedgerEntry} />
            </div>
        </DialogContent>
      </Dialog>
    </MaterialFormsContext.Provider>
  );
};
