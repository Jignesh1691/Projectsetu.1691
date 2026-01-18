'use client';

import { updateState, setGlobalStateSetter, AppStateSetter } from './state-manager';
import type {
    Transaction,
    Recordable,
    Project,
    Ledger,
    Photo,
    Document as AppDocument,
    Task,
    Labor,
    Hajari,
    ProjectUser,
    Notification,
    ApprovalStatus,
    PaymentMode,
    Material,
    MaterialLedgerEntry,
    User,
    JournalEntry,
} from '../definitions';
import { defaultState } from '../default-state';

export const initializeStore = async (setState: AppStateSetter) => {
    setGlobalStateSetter(setState, defaultState);
    try {
        // --- Phase 1: Immediate Parallel Fetching ---
        // Start ALL essential fetches at once to utilize network capacity
        const projectsPromise = fetch('/api/projects').then(res => res.ok ? res.json() : []);
        const ledgersPromise = fetch('/api/ledgers?summarize=true').then(res => res.ok ? res.json() : []);
        const usersPromise = fetch('/api/users').then(res => res.ok ? res.json() : []);
        const laborsPromise = fetch('/api/labors').then(res => res.ok ? res.json() : []);
        const materialsPromise = fetch('/api/materials').then(res => res.ok ? res.json() : []);

        // Start background data fetches immediately too
        const transactionsPromise = fetch('/api/transactions?limit=100').then(res => res.ok ? res.json() : []);
        const recordsPromise = fetch('/api/records?limit=100').then(res => res.ok ? res.json() : []);
        const tasksPromise = fetch('/api/tasks?limit=100').then(res => res.ok ? res.json() : []);
        const hajariPromise = fetch('/api/hajari?limit=100').then(res => res.ok ? res.json() : []);
        const notificationsPromise = fetch('/api/notifications?limit=50').then(res => res.ok ? res.json() : []);

        // Wave A: Critical Metadata (Projects, Ledgers) - Unblocks Navigation
        Promise.all([projectsPromise, ledgersPromise]).then(([projects, ledgers]) => {
            const initialProjectUsers: ProjectUser[] = [];
            if (Array.isArray(projects)) {
                projects.forEach((p: any) => {
                    if (p.projectUsers && Array.isArray(p.projectUsers)) {
                        p.projectUsers.forEach((pu: any) => {
                            initialProjectUsers.push({
                                project_id: pu.projectId,
                                user_id: pu.userId,
                                status: 'active',
                                can_view_finances: pu.canViewFinances,
                                can_create_entries: pu.canCreateEntries,
                            });
                        });
                    }
                });
            }

            updateState(prev => ({
                ...prev,
                projects: Array.isArray(projects) ? projects : [],
                ledgers: Array.isArray(ledgers) ? ledgers.map((l: any) => mapModelToStore('ledger', l)) : [],
                project_users: initialProjectUsers,
                isInitialized: true // Unblocks sidebar
            }));
        }).catch(err => console.error("Error loading Wave A:", err));

        // Wave B: Metadata (Users, Labors, Materials) - Unblocks Forms
        Promise.all([usersPromise, laborsPromise, materialsPromise]).then(([users, labors, materials]) => {
            const mappedUsers = Array.isArray(users) ? users.map((u: any) => ({
                ...u.user,
                name: u.user.name && u.user.name !== "Unknown" ? u.user.name : u.user.email.split('@')[0],
                role: u.role,
                organization_id: u.organizationId
            })).filter(u => u.id) : [];

            updateState(prev => {
                const finalProjectUsers = [...prev.project_users];
                if (Array.isArray(users)) {
                    users.forEach((u: any) => {
                        if (u.user && u.user.assignedProjects && Array.isArray(u.user.assignedProjects)) {
                            u.user.assignedProjects.forEach((ap: any) => {
                                const projectId = typeof ap === 'string' ? ap : ap.projectId;
                                if (!finalProjectUsers.some(mpu => mpu.user_id === u.user.id && mpu.project_id === projectId)) {
                                    finalProjectUsers.push({
                                        project_id: projectId,
                                        user_id: u.user.id,
                                        status: 'active',
                                        can_view_finances: typeof ap === 'object' ? ap.canViewFinances : false,
                                        can_create_entries: typeof ap === 'object' ? ap.canCreateEntries : false,
                                    });
                                }
                            });
                        }
                    });
                }
                return {
                    ...prev,
                    users: mappedUsers,
                    project_users: finalProjectUsers,
                    labors: Array.isArray(labors) ? labors : [],
                    materials: Array.isArray(materials) ? materials.map((m: any) => mapModelToStore('material', m)) : [],
                };
            });
        }).catch(err => console.error("Error loading Wave B:", err));

        // Wave C: Core Content (Transactions, Records, Tasks, Hajari) - Unblocks Dashboard
        Promise.all([transactionsPromise, recordsPromise, tasksPromise, hajariPromise, notificationsPromise]).then(([transactions, records, tasks, hajari, notifications]) => {
            updateState(prev => ({
                ...prev,
                transactions: Array.isArray(transactions) ? transactions.map((t: any) => mapModelToStore('transaction', t)) : [],
                recordables: Array.isArray(records) ? records.map((r: any) => mapModelToStore('recordable', r)) : [],
                tasks: Array.isArray(tasks) ? tasks.map((tk: any) => mapModelToStore('task', tk)) : [],
                hajari_records: Array.isArray(hajari) ? hajari.map((h: any) => mapModelToStore('hajari', h)) : [],
                records_loaded: true,
                transactions_loaded: true,
                notifications: Array.isArray(notifications) ? notifications.map((n: any) => ({
                    ...n,
                    user_id: n.userId,
                    item_id: n.itemId,
                    item_type: n.itemType,
                    is_read: n.isRead,
                    created_at: n.createdAt,
                })) : [],
            }));
        }).catch(err => console.error("Error loading Wave C:", err));

        // Wave D: Heavy Assets (Photos, Documents, Journal)
        // Fetched with a slight delay to prioritize interaction critical data
        setTimeout(() => {
            const photosPromise = fetch('/api/photos?limit=50').then(res => res.ok ? res.json() : []);
            const documentsPromise = fetch('/api/documents?limit=50').then(res => res.ok ? res.json() : []);
            const materialLedgerPromise = fetch('/api/material-ledger?limit=100').then(res => res.ok ? res.json() : []);
            const journalPromise = fetch('/api/journal?limit=100').then(res => res.ok ? res.json() : []);

            Promise.all([photosPromise, documentsPromise, materialLedgerPromise, journalPromise]).then(([photos, documents, materialLedger, journal]) => {
                updateState(prev => ({
                    ...prev,
                    photos: Array.isArray(photos) ? photos.map((p: any) => mapModelToStore('photo', p)) : [],
                    documents: Array.isArray(documents) ? documents.map((d: any) => mapModelToStore('document', d)) : [],
                    material_ledger: Array.isArray(materialLedger) ? materialLedger.map((ml: any) => mapModelToStore('materialledgerentry', ml)) : [],
                    journal_entries: Array.isArray(journal) ? journal.map((j: any) => mapModelToStore('journalentry', j)) : [],
                }));
            }).catch(err => console.error("Error loading Wave D:", err));
        }, 800);

    } catch (error) {
        console.error("Failed to initialize store:", error);
    }
};

export function mapModelToStore(itemType: string, item: any): any {
    if (!item) return item;

    const mapped: any = { ...item };

    if (item.approvalStatus) mapped.approval_status = item.approvalStatus;
    if (item.submittedBy) mapped.submitted_by = item.submittedBy;
    if (item.requestMessage) mapped.request_message = item.requestMessage;
    if (item.rejectionCount !== undefined) mapped.rejection_count = item.rejectionCount;
    if (item.pendingData) mapped.pending_data = item.pendingData;
    if (item.pendingData) mapped.pending_data = item.pendingData;
    if (item.createdBy) mapped.created_by = item.createdBy;
    if (item.creator) mapped.creator = item.creator;
    if (item.organizationId) mapped.organization_id = item.organizationId;
    if (item.projectId) mapped.project_id = item.projectId;
    if (item.ledgerId) mapped.ledger_id = item.ledgerId;
    if (item.canViewFinances !== undefined) mapped.can_view_finances = item.canViewFinances;
    if (item.canCreateEntries !== undefined) mapped.can_create_entries = item.canCreateEntries;

    switch (itemType.toLowerCase()) {
        case 'transaction':
            if (item.paymentMode) mapped.payment_mode = item.paymentMode;
            if (item.billUrl) mapped.bill_url = item.billUrl;
            if (item.convertedFromRecordId) mapped.converted_from_record_id = item.convertedFromRecordId;
            if (item.hajariSettlementId) mapped.hajari_settlement_id = item.hajariSettlementId;
            break;
        case 'recordable':
        case 'record':
            if (item.dueDate) mapped.due_date = item.dueDate;
            if (item.paymentMode) mapped.payment_mode = item.paymentMode;
            if (item.billUrl) mapped.bill_url = item.billUrl;
            break;
        case 'hajari':
            if (item.laborId) mapped.labor_id = item.laborId;
            if (item.overtimeHours !== undefined) mapped.overtime_hours = item.overtimeHours;
            break;
        case 'task':
            if (item.dueDate) mapped.due_date = item.dueDate;
            break;
        case 'photo':
            if (item.url) mapped.image_url = item.url;
            if (item.createdAt) mapped.created_at = item.createdAt;
            break;
        case 'document':
            if (item.url) mapped.document_url = item.url;
            if (item.name) mapped.document_name = item.name;
            if (item.createdAt) mapped.created_at = item.createdAt;
            break;
        case 'materialledgerentry':
            if (item.materialId) mapped.material_id = item.materialId;
            if (item.challanUrl) mapped.challan_url = item.challanUrl;
            break;
        case 'journalentry':
            if (item.debitMode) mapped.debit_mode = item.debitMode;
            if (item.debitLedgerId) mapped.debit_ledger_id = item.debitLedgerId;
            if (item.creditMode) mapped.credit_mode = item.creditMode;
            if (item.creditLedgerId) mapped.credit_ledger_id = item.creditLedgerId;
            if (item.debitLedger) mapped.debit_ledger = item.debitLedger;
            if (item.creditLedger) mapped.credit_ledger = item.creditLedger;
            break;
    }

    return mapped;
};
