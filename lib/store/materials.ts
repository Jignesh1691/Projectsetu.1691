'use client';

import { updateState } from './state-manager';
import { mapModelToStore } from './core';
import { Material, MaterialLedgerEntry, User } from '../definitions';

export const addMaterial = async (data: Omit<Material, 'id' | 'approval_status' | 'pending_data' | 'rejection_count'>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, requestMessage }),
        });
        if (!response.ok) throw new Error("Failed to add material");
        const newMaterial = await response.json();
        const mappedMaterial = mapModelToStore('material', newMaterial);

        updateState(prev => ({ ...prev, materials: [...prev.materials, mappedMaterial] }));
    } catch (error) {
        console.error("Error adding material:", error);
        throw error;
    }
};

export const editMaterial = async (id: string, data: Partial<Omit<Material, 'id'>>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/materials', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...data, requestMessage }),
        });
        if (!response.ok) throw new Error("Failed to update material");
        const updatedMaterial = await response.json();
        const mappedMaterial = mapModelToStore('material', updatedMaterial);

        updateState(prev => ({
            ...prev,
            materials: prev.materials.map((m: Material) => m.id === id ? mappedMaterial : m)
        }));
    } catch (error) {
        console.error("Error editing material:", error);
        throw error;
    }
};

export const deleteMaterial = async (id: string, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch(`/api/materials?id=${id}${requestMessage ? `&message=${encodeURIComponent(requestMessage)}` : ''}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error("Failed to delete material");

        const result = await response.json();

        updateState(prev => {
            if (result.status === 'pending-delete') {
                const mappedMaterial = mapModelToStore('material', result.material || result.data);
                return {
                    ...prev,
                    materials: prev.materials.map((m: Material) => m.id === id ? mappedMaterial : m)
                };
            }
            return { ...prev, materials: prev.materials.filter((m: Material) => m.id !== id) };
        });
    } catch (error) {
        console.error("Error deleting material:", error);
        throw error;
    }
};

export const addMaterialLedgerEntry = async (data: Omit<MaterialLedgerEntry, 'id' | 'approval_status'>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/material-ledger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...data,
                materialId: data.material_id,
                projectId: data.project_id,
                challanUrl: data.challan_url,
                requestMessage
            }),
        });
        if (!response.ok) throw new Error("Failed to add material entry");

        const newEntry = await response.json();
        const mappedEntry = mapModelToStore('materialledgerentry', newEntry);

        updateState(prev => ({ ...prev, material_ledger: [...prev.material_ledger, mappedEntry] }));
    } catch (error) {
        console.error("Error adding material ledger entry:", error);
        throw error;
    }
};

export const editMaterialLedgerEntry = async (id: string, data: Partial<MaterialLedgerEntry>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/material-ledger', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                ...data,
                materialId: data.material_id,
                projectId: data.project_id,
                challanUrl: data.challan_url,
                requestMessage
            }),
        });
        if (!response.ok) throw new Error("Failed to update material entry");

        const updatedEntry = await response.json();
        const mappedEntry = mapModelToStore('materialledgerentry', updatedEntry);

        updateState(prev => {
            const index = prev.material_ledger.findIndex((ml: MaterialLedgerEntry) => ml.id === id);
            if (index === -1) return prev;
            const updated = [...prev.material_ledger];
            updated[index] = mappedEntry;
            return { ...prev, material_ledger: updated };
        });
    } catch (error) {
        console.error("Error editing material ledger entry:", error);
        throw error;
    }
};

export const deleteMaterialLedgerEntry = async (id: string, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch(`/api/material-ledger?id=${id}${requestMessage ? `&message=${encodeURIComponent(requestMessage)}` : ''}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error("Failed to delete material entry");

        const result = await response.json();

        updateState(prev => {
            if (result.status === 'pending-delete') {
                const mappedEntry = mapModelToStore('materialledgerentry', result.entry || result.data);
                return {
                    ...prev,
                    material_ledger: prev.material_ledger.map((ml: MaterialLedgerEntry) => ml.id === id ? mappedEntry : ml)
                };
            }
            return { ...prev, material_ledger: prev.material_ledger.filter((ml: MaterialLedgerEntry) => ml.id !== id) };
        });
    } catch (error) {
        console.error("Error deleting material ledger entry:", error);
        throw error;
    }
};
