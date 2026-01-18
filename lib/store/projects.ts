'use client';

import { updateState } from './state-manager';
import { Project, ProjectUser, Transaction, Photo, Document as AppDocument } from '../definitions';

export const addProject = async (projectData: Omit<Project, 'id'>, assigned_users: (string | { userId: string, canViewFinances: boolean, canCreateEntries: boolean })[] = []) => {
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...projectData,
                assigned_users
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to create project");
        }

        const newProject = await response.json();

        updateState(prev => {
            const newProjectUsers = assigned_users.map(item => ({
                project_id: newProject.id,
                user_id: typeof item === 'string' ? item : item.userId,
                status: 'active',
                can_view_finances: typeof item === 'string' ? true : item.canViewFinances,
                can_create_entries: typeof item === 'string' ? true : item.canCreateEntries,
            }));

            return {
                ...prev,
                projects: [newProject, ...prev.projects],
                project_users: [...prev.project_users, ...newProjectUsers]
            };
        });
        return newProject;
    } catch (error) {
        console.error("Error adding project:", error);
        throw error;
    }
};

export const editProject = async (id: string, projectData: Partial<Project>, assigned_users: (string | { userId: string, canViewFinances: boolean, canCreateEntries: boolean })[]) => {
    try {
        const response = await fetch('/api/projects', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id,
                ...projectData,
                assigned_users
            }),
        });

        if (!response.ok) throw new Error("Failed to update project");

        const updatedProject = await response.json();

        updateState(prev => {
            const projectIndex = prev.projects.findIndex((p: Project) => p.id === id);
            if (projectIndex === -1) return prev;

            const updatedProjects = [...prev.projects];
            updatedProjects[projectIndex] = updatedProject;

            const otherProjectUsers = prev.project_users.filter((pu: ProjectUser) => pu.project_id !== id);
            const newProjectUsers = assigned_users.map(item => ({
                project_id: id,
                user_id: typeof item === 'string' ? item : item.userId,
                status: 'active',
                can_view_finances: typeof item === 'string' ? true : item.canViewFinances,
                can_create_entries: typeof item === 'string' ? true : item.canCreateEntries,
            }));

            return { ...prev, projects: updatedProjects, project_users: [...otherProjectUsers, ...newProjectUsers] };
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
