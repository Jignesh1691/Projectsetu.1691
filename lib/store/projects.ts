'use client';

import { updateState } from './state-manager';
import { Project, ProjectUser, Transaction, Photo, Document as AppDocument } from '../definitions';

export const addProject = async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'organization_id'>) => {
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create project");
        }

        const newProject = await response.json();

        updateState(prev => {
            return {
                ...prev,
                projects: [newProject, ...prev.projects],
            };
        });
        return newProject;
    } catch (error) {
        console.error("Error adding project:", error);
        throw error;
    }
};

export const editProject = async (id: string, projectData: Partial<Project>) => {
    try {
        const response = await fetch('/api/projects', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                ...projectData,
            }),
        });

        if (!response.ok) throw new Error("Failed to update project");

        const updatedProject = await response.json();

        updateState(prev => {
            const projectIndex = prev.projects.findIndex((p: Project) => p.id === id);
            if (projectIndex === -1) return prev;

            const updatedProjects = [...prev.projects];
            updatedProjects[projectIndex] = updatedProject;

            return { ...prev, projects: updatedProjects };
        });
    } catch (error) {
        console.error("Error editing project:", error);
        throw error;
    }
};

export const deleteProject = async (id: string) => {
    try {
        const response = await fetch(`/api/projects?id=${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) throw new Error("Failed to delete project");

        updateState(prev => ({
            ...prev,
            projects: prev.projects.filter((p: Project) => p.id !== id),
            transactions: prev.transactions.filter((t: Transaction) => t.project_id !== id),
            photos: prev.photos.filter((p: Photo) => p.project_id !== id),
            documents: prev.documents.filter((d: AppDocument) => d.project_id !== id),
        }));
    } catch (error) {
        console.error("Error deleting project:", error);
        throw error;
    }
};
