'use client';

import { updateState } from './state-manager';
import { mapModelToStore } from './core';
import { Task, Photo, Document as AppDocument, User } from '../definitions';

// --- Documents ---
export const addAppDocument = async (data: Omit<AppDocument, 'id' | 'created_at' | 'approval_status' | 'rejection_count'>, currentUser: User, requestMessage?: string) => {
    try {
        let response;
        if (data.file) {
            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('name', data.document_name);
            formData.append('description', data.description || '');
            formData.append('projectId', data.project_id);
            if (requestMessage) formData.append('requestMessage', requestMessage);

            response = await fetch('/api/documents', {
                method: 'POST',
                body: formData,
            });
        } else {
            response = await fetch('/api/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: data.document_url,
                    name: data.document_name,
                    description: data.description,
                    projectId: data.project_id,
                    requestMessage
                }),
            });
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to add document");
        }

        const newDoc = await response.json();
        const mappedDoc = mapModelToStore('document', newDoc);
        updateState(prev => ({ ...prev, documents: [mappedDoc, ...prev.documents] }));
    } catch (error) {
        console.error("Error adding document:", error);
        throw error;
    }
};

export const editAppDocument = async (id: string, data: Partial<AppDocument>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/documents', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                url: data.document_url,
                name: data.document_name,
                description: data.description,
                projectId: data.project_id,
                requestMessage
            }),
        });

        if (!response.ok) throw new Error("Failed to update document");

        const updatedDoc = await response.json();
        const mappedDoc = mapModelToStore('document', updatedDoc);

        updateState(prev => {
            const index = prev.documents.findIndex((d: AppDocument) => d.id === id);
            if (index === -1) return prev;
            const updated = [...prev.documents];
            updated[index] = mappedDoc;
            return { ...prev, documents: updated };
        });
    } catch (error) {
        console.error("Error editing document:", error);
        throw error;
    }
};

export const deleteAppDocument = async (id: string, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch(`/api/documents?id=${id}${requestMessage ? `&message=${encodeURIComponent(requestMessage)}` : ''}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error("Failed to delete document");
        const result = await response.json();

        updateState(prev => {
            if (result.status === 'pending-delete') {
                const mappedDoc = mapModelToStore('document', result.document || result.data);
                return {
                    ...prev,
                    documents: prev.documents.map((d: AppDocument) => d.id === id ? mappedDoc : d)
                };
            }
            return { ...prev, documents: prev.documents.filter((d: AppDocument) => d.id !== id) };
        });
    } catch (error) {
        console.error("Error deleting document:", error);
        throw error;
    }
};

// --- Photos ---
export const addPhoto = async (data: Omit<Photo, 'id' | 'created_at' | 'approval_status' | 'rejection_count'>, currentUser: User, requestMessage?: string) => {
    try {
        let response;
        if (data.file) {
            const formData = new FormData();
            formData.append('file', data.file);
            formData.append('description', data.description || '');
            formData.append('projectId', data.project_id);
            if (requestMessage) formData.append('requestMessage', requestMessage);

            response = await fetch('/api/photos', {
                method: 'POST',
                body: formData,
            });
        } else {
            response = await fetch('/api/photos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: data.image_url,
                    description: data.description,
                    projectId: data.project_id,
                    requestMessage
                }),
            });
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to add photo");
        }

        const newPhoto = await response.json();
        const mappedPhoto = mapModelToStore('photo', newPhoto);
        updateState(prev => ({ ...prev, photos: [mappedPhoto, ...prev.photos] }));
    } catch (error) {
        console.error("Error adding photo:", error);
        throw error;
    }
};

export const editPhoto = async (id: string, data: Partial<Photo>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/photos', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                url: data.image_url,
                description: data.description,
                projectId: data.project_id,
                requestMessage
            }),
        });

        if (!response.ok) throw new Error("Failed to update photo");

        const updatedPhoto = await response.json();
        const mappedPhoto = mapModelToStore('photo', updatedPhoto);

        updateState(prev => {
            const index = prev.photos.findIndex((p: Photo) => p.id === id);
            if (index === -1) return prev;
            const updated = [...prev.photos];
            updated[index] = mappedPhoto;
            return { ...prev, photos: updated };
        });
    } catch (error) {
        console.error("Error editing photo:", error);
        throw error;
    }
};

export const deletePhoto = async (id: string, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch(`/api/photos?id=${id}${requestMessage ? `&message=${encodeURIComponent(requestMessage)}` : ''}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error("Failed to delete photo");
        const result = await response.json();

        updateState(prev => {
            if (result.status === 'pending-delete') {
                const mappedPhoto = mapModelToStore('photo', result.photo || result.data);
                return {
                    ...prev,
                    photos: prev.photos.map((p: Photo) => p.id === id ? mappedPhoto : p)
                };
            }
            return { ...prev, photos: prev.photos.filter((p: Photo) => p.id !== id) };
        });
    } catch (error) {
        console.error("Error deleting photo:", error);
        throw error;
    }
};

// --- Tasks ---
export const addTask = async (data: Omit<Task, 'id' | 'approval_status' | 'rejection_count'>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...data,
                projectId: data.project_id,
                dueDate: data.due_date,
                requestMessage
            }),
        });

        if (!response.ok) throw new Error("Failed to add task");

        const newTask = await response.json();
        const mappedTask = mapModelToStore('task', newTask);
        updateState(prev => ({ ...prev, tasks: [...prev.tasks, mappedTask] }));
    } catch (error) {
        console.error("Error adding task:", error);
        throw error;
    }
};

export const editTask = async (id: string, data: Partial<Task>, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch('/api/tasks', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                ...data,
                projectId: data.project_id,
                dueDate: data.due_date,
                requestMessage
            }),
        });

        if (!response.ok) throw new Error("Failed to update task");

        const updatedTask = await response.json();
        const mappedTask = mapModelToStore('task', updatedTask);

        updateState(prev => {
            const index = prev.tasks.findIndex((t: Task) => t.id === id);
            if (index === -1) return prev;
            const updated = [...prev.tasks];
            updated[index] = mappedTask;
            return { ...prev, tasks: updated };
        });
    } catch (error) {
        console.error("Error editing task:", error);
        throw error;
    }
};

export const deleteTask = async (id: string, currentUser: User, requestMessage?: string) => {
    try {
        const response = await fetch(`/api/tasks?id=${id}${requestMessage ? `&message=${encodeURIComponent(requestMessage)}` : ''}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error("Failed to delete task");
        const result = await response.json();

        updateState(prev => {
            if (result.status === 'pending-delete') {
                const mappedTask = mapModelToStore('task', result.task || result.data);
                return {
                    ...prev,
                    tasks: prev.tasks.map((t: Task) => t.id === id ? mappedTask : t)
                };
            }
            return { ...prev, tasks: prev.tasks.filter((t: Task) => t.id !== id) };
        });
    } catch (error) {
        console.error("Error deleting task:", error);
        throw error;
    }
};
