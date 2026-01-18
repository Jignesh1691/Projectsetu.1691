'use client';

export type AppStateSetter = (fn: (prevState: any) => any) => void;
let _setState: AppStateSetter;
let _currentState: any;

export const setGlobalStateSetter = (setState: AppStateSetter, initialState?: any) => {
    _setState = setState;
    if (initialState) _currentState = initialState;
};

export const updateState = (updater: (prevState: any) => any) => {
    if (_setState) {
        _setState((prev: any) => {
            const next = updater(prev);
            _currentState = next;
            return next;
        });
    } else {
        console.error("Store not initialized. Call initializeStore first.");
    }
};

export const getCurrentState = () => _currentState;

export const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const asyncDelay = (ms: number) => new Promise(res => setTimeout(res, ms));
