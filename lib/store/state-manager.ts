'use client';

export type AppStateSetter = (fn: (prevState: any) => any) => void;
let _setState: AppStateSetter;

export const setGlobalStateSetter = (setState: AppStateSetter) => {
    _setState = setState;
};

export const updateState = (updater: (prevState: any) => any) => {
    if (_setState) {
        _setState(updater);
    } else {
        console.error("Store not initialized. Call initializeStore first.");
    }
};

export const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const asyncDelay = (ms: number) => new Promise(res => setTimeout(res, ms));
