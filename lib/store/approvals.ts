'use client';

import { updateState } from './state-manager';
import { mapModelToStore, initializeStore } from './core';

const collectionsMap: { [key: string]: keyof any } = {
    transaction: 'transactions',
    recordable: 'recordables',
    task: 'tasks',
    photo: 'photos',
    document: 'documents',
    ledger: 'ledgers',
    hajari: 'hajari_records',
    material: 'materials',
    materialledgerentry: 'material_ledger',
};

export const approveChange = async (itemType: string, itemId: string) => {
    const collectionName = collectionsMap[itemType];
    if (!collectionName) return;

    try {
        const response = await fetch('/api/approvals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: itemId,
                module: itemType,
                status: 'approved'
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to approve ${itemType}`);
        }

        const result = await response.json();

        updateState(prev => {
            const collection = [...prev[collectionName]];
            const itemIndex = collection.findIndex((i: any) => i.id === itemId);

            if (result.action === 'deleted') {
                if (itemIndex !== -1) collection.splice(itemIndex, 1);
            } else if (result.data) {
                const mappedData = mapModelToStore(itemType, result.data);
                if (itemIndex !== -1) {
                    collection[itemIndex] = mappedData;
                } else {
                    collection.unshift(mappedData);
                }
            }

            return { ...prev, [collectionName]: collection };
        });

        if (itemType === 'hajari' && result.action === 'approved') {
            const tempSetState = (fn: any) => updateState(fn);
            await initializeStore(tempSetState as any);
        }

    } catch (error) {
        console.error(`Error approving ${itemType}:`, error);
        throw error;
    }
};

export const rejectChange = async (itemType: string, itemId: string, remarks: string) => {
    const collectionName = collectionsMap[itemType];
    if (!collectionName) return;

    try {
        const response = await fetch('/api/approvals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: itemId,
                module: itemType,
                status: 'rejected',
                remarks
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to reject ${itemType}`);
        }

        const result = await response.json();

        updateState(prev => {
            const collection = [...prev[collectionName]];
            const itemIndex = collection.findIndex((i: any) => i.id === itemId);
            if (itemIndex === -1) return prev;

            const mappedData = mapModelToStore(itemType, result.data);
            collection[itemIndex] = mappedData;

            return { ...prev, [collectionName]: collection };
        });
    } catch (error) {
        console.error(`Error rejecting ${itemType}:`, error);
        throw error;
    }
};
