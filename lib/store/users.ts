'use client';

import { updateState } from './state-manager';

type UserFormData = {
    name: string;
    email: string;
    role: 'admin' | 'user';
    password?: string;
    assignedProjects: string[];
    isActive: boolean;
};

export const addUser = async (data: UserFormData) => {
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Failed to add user");

        const newMember = await response.json();
        updateState(prev => ({
            ...prev,
            users: [...prev.users, newMember.user]
        }));
    } catch (error) {
        console.error("Error adding user:", error);
        throw error;
    }
};

export const editUser = async (id: string, data: Partial<UserFormData> & { password?: string, mustChangePassword?: boolean }) => {
    try {
        const response = await fetch('/api/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...data }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Failed to update user" }));
            throw new Error(errorData.error || "Failed to update user");
        }

        const updatedMember = await response.json();
        updateState(prev => ({
            ...prev,
            users: prev.users.map((u: any) => u.id === updatedMember.user.id ? updatedMember.user : u)
        }));
    } catch (error) {
        console.error("Error editing user:", error);
        throw error;
    }
};

export const deleteUser = async (id: string) => {
    try {
        const response = await fetch(`/api/users?id=${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error("Failed to delete user");

        updateState(prev => ({
            ...prev,
            users: prev.users.filter((u: any) => u.id !== id),
        }));
    } catch (error) {
        console.error("Error deleting user:", error);
        throw error;
    }
};
