/**
 * Permission Matrix and Utilities for Role-Based Access Control
 * 
 * This module defines which actions require approval based on user role and resource type.
 */

export type ResourceAction = 'create' | 'edit' | 'delete';
export type ResourceModule =
  | 'ledger'
  | 'transaction'
  | 'record'
  | 'task'
  | 'photo'
  | 'document'
  | 'hajari'
  | 'material'
  | 'materialledger'
  | 'journal';

/**
 * Approval Matrix: Defines which actions require approval for USER role
 * - true: Action requires admin approval before taking effect
 * - false: Action takes effect immediately
 * 
 * Note: ADMIN role never requires approval for any action
 */
export const APPROVAL_MATRIX: Record<
  ResourceModule,
  { create: boolean; edit: boolean; delete: boolean }
> = {
  // Ledgers: Edit/Delete require approval, Create is immediate (notify admin)
  ledger: { create: false, edit: true, delete: true },

  // Transactions: Create immediate, edit/delete require approval
  // Exception: Salary settlement transactions are immutable except for admin
  transaction: { create: false, edit: true, delete: true },

  // Records (Outstandings): Create immediate, edit/delete require approval
  record: { create: false, edit: true, delete: true },

  // Tasks: Create immediate, edit/delete require approval
  task: { create: false, edit: true, delete: true },

  // Photos: Upload immediate, edit metadata/delete require approval
  photo: { create: false, edit: true, delete: true },

  // Documents: Upload immediate, edit metadata/delete require approval
  document: { create: false, edit: true, delete: true },

  // Hajari (Labor): Create/settle immediate, edit/delete/revert require approval
  hajari: { create: false, edit: true, delete: true },

  // Materials: Create definition immediate, edit/delete require approval
  material: { create: false, edit: true, delete: true },

  // Material Ledger: Create movements immediate, edit/delete require approval
  materialledger: { create: false, edit: true, delete: true },

  // Journal Entries: Create immediate, edit/delete require approval
  journal: { create: false, edit: true, delete: true },
};

/**
 * Determines if an action requires approval based on user role and module
 * 
 * @param module - The resource module being accessed
 * @param action - The action being performed (create/edit/delete)
 * @param userRole - The user's role (admin/user)
 * @returns true if approval is required, false otherwise
 */
export function requiresApproval(
  module: ResourceModule,
  action: ResourceAction,
  userRole: 'admin' | 'user'
): boolean {
  // Admins never need approval
  if (userRole === 'admin') return false;

  // Check approval matrix for user role
  return APPROVAL_MATRIX[module][action];
}

/**
 * Checks if a user can access a specific project
 * 
 * @param projectId - The project ID to check access for
 * @param userId - The user ID checking access
 * @param userRole - The user's role
 * @param projectUsers - List of project-user assignments
 * @returns true if user can access the project, false otherwise
 */
export function canAccessProject(
  projectId: string,
  userId: string,
  userRole: 'admin' | 'user',
  projectUsers: { projectId: string; userId: string; status: string }[]
): boolean {
  // Admins can access all projects in their organization
  if (userRole === 'admin') return true;

  // Users can only access projects they're explicitly assigned to (and active)
  return projectUsers.some(
    pu => pu.projectId === projectId && pu.userId === userId && pu.status === 'active'
  );
}

/**
 * Filters projects to only those accessible by the user
 * 
 * @param allProjects - All projects in the organization  
 * @param userId - The user ID
 * @param userRole - The user's role
 * @param projectUsers - List of project-user assignments
 * @returns Filtered array of projects the user can access
 */
export function filterAccessibleProjects<T extends { id: string }>(
  allProjects: T[],
  userId: string,
  userRole: 'admin' | 'user',
  projectUsers: { projectId: string; userId: string; status: string }[]
): T[] {
  // Admins can access all projects
  if (userRole === 'admin') return allProjects;

  // Users can only access assigned projects
  const assignedProjectIds = projectUsers
    .filter(pu => pu.userId === userId && pu.status === 'active')
    .map(pu => pu.projectId);

  return allProjects.filter(project => assignedProjectIds.includes(project.id));
}

/**
 * Checks if user can access a specific resource based on its project assignment
 * 
 * @param resource - The resource with a projectId field
 * @param userId - The user ID
 * @param userRole - The user's role
 * @param projectUsers - List of project-user assignments
 * @returns true if user can access the resource, false otherwise
 */
export function canAccessResource(
  resource: { projectId?: string },
  userId: string,
  userRole: 'admin' | 'user',
  projectUsers: { projectId: string; userId: string; status: string }[]
): boolean {
  // If resource has no project, check might be org-level (admin only)
  if (!resource.projectId) {
    return userRole === 'admin';
  }

  return canAccessProject(resource.projectId, userId, userRole, projectUsers);
}