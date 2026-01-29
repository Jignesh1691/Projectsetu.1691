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

export const initializeStore = async (setState: AppStateSetter) => {
    setGlobalStateSetter(setState);
    try {
        // --- Phase 1: Critical Metadata (Instant UI / Sidebar) ---
        const [
            projectsRes, ledgersRes, usersRes, laborsRes, materialsRes, financialAccountsRes
        ] = await Promise.all([
            fetch('/api/projects'),
            fetch('/api/ledgers'),
            fetch('/api/users'),
            fetch('/api/labors'),
            fetch('/api/materials'),
            fetch('/api/financial-accounts'),
        ]);

        const [users, projects, ledgers, labors, materials, financialAccounts] = await Promise.all([
            usersRes.ok ? usersRes.json() : [],
            projectsRes.ok ? projectsRes.json() : [],
            ledgersRes.ok ? ledgersRes.json() : [],
            laborsRes.ok ? laborsRes.json() : [],
            materialsRes.ok ? materialsRes.json() : [],
            financialAccountsRes.ok ? financialAccountsRes.json() : [],
        ]);

        // Map users immediately for permission checks
        const mappedUsers = Array.isArray(users) ? users.map((u: any) => ({
            ...u.user,
            name: u.user.name && u.user.name !== "Unknown" ? u.user.name : u.user.email.split('@')[0],
            role: u.role,
            organization_id: u.organizationId
        })).filter(u => u.id) : [];

        const mappedProjectUsers: ProjectUser[] = [];
        if (Array.isArray(users)) {
            users.forEach((u: any) => {
                if (u.user && u.user.assignedProjects && Array.isArray(u.user.assignedProjects)) {
                    u.user.assignedProjects.forEach((projectId: string) => {
                        mappedProjectUsers.push({
                            project_id: projectId,
                            user_id: u.user.id,
                            status: 'active'
                        });
                    });
                }
            });
        }

        // Commit Phase 1 - App is now "Initialized" for user interaction
        updateState((prev: any) => ({
            ...prev,
            users: mappedUsers,
            project_users: mappedProjectUsers,
            projects: Array.isArray(projects) ? projects : [],
            ledgers: Array.isArray(ledgers) ? ledgers.map((l: any) => mapModelToStore('ledger', l)) : [],
            labors: Array.isArray(labors) ? labors : [],
            materials: Array.isArray(materials) ? materials.map((m: any) => mapModelToStore('material', m)) : [],
            financial_accounts: Array.isArray(financialAccounts) ? financialAccounts : [],
            isInitialized: true // UNBLOCK UI HERE
        }));

        // --- Phase 2: Core Data (Dashboards / Lists) ---
        // Fetch in background - UI is already interactive
        Promise.all([
            fetch('/api/transactions'),
            fetch('/api/records'),
            fetch('/api/tasks'),
            fetch('/api/hajari'),
            fetch('/api/notifications'),
        ]).then(async ([transactionsRes, recordsRes, tasksRes, hajariRes, notificationsRes]) => {
            const [transactions, records, tasks, hajari, notifications] = await Promise.all([
                transactionsRes.ok ? transactionsRes.json() : [],
                recordsRes.ok ? recordsRes.json() : [],
                tasksRes.ok ? tasksRes.json() : [],
                hajariRes.ok ? hajariRes.json() : [],
                notificationsRes.ok ? notificationsRes.json() : [],
            ]);

            updateState((prev: any) => ({
                ...prev,
                transactions: Array.isArray(transactions) ? transactions.map((t: any) => mapModelToStore('transaction', t)) : [],
                recordables: Array.isArray(records) ? records.map((r: any) => mapModelToStore('recordable', r)) : [],
                tasks: Array.isArray(tasks) ? tasks.map((tk: any) => mapModelToStore('task', tk)) : [],
                hajari_records: Array.isArray(hajari) ? hajari.map((h: any) => mapModelToStore('hajari', h)) : [],
                notifications: Array.isArray(notifications) ? notifications.map((n: any) => ({
                    ...n,
                    user_id: n.userId,
                    item_id: n.itemId,
                    item_type: n.itemType,
                    is_read: n.isRead,
                    created_at: n.createdAt,
                })) : [],
            }));

            // --- Phase 3: Heavy / Archive Data (Secondary Views) ---
            Promise.all([
                fetch('/api/photos'),
                fetch('/api/documents'),
                fetch('/api/material-ledger'),
                fetch('/api/journal'),
            ]).then(async ([photosRes, documentsRes, materialLedgerRes, journalRes]) => {
                const [photos, documents, materialLedger, journal] = await Promise.all([
                    photosRes.ok ? photosRes.json() : [],
                    documentsRes.ok ? documentsRes.json() : [],
                    materialLedgerRes.ok ? materialLedgerRes.json() : [],
                    journalRes.ok ? journalRes.json() : [],
                ]);

                updateState((prev: any) => ({
                    ...prev,
                    photos: Array.isArray(photos) ? photos.map((p: any) => mapModelToStore('photo', p)) : [],
                    documents: Array.isArray(documents) ? documents.map((d: any) => mapModelToStore('document', d)) : [],
                    material_ledger: Array.isArray(materialLedger) ? materialLedger.map((ml: any) => mapModelToStore('materialledgerentry', ml)) : [],
                    journal_entries: Array.isArray(journal) ? journal.map((j: any) => mapModelToStore('journalentry', j)) : [],
                }));
            }).catch(e => console.error("Phase 3 Load Error:", e));

        }).catch(e => console.error("Phase 2 Load Error:", e));

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
    if (item.financialAccountId) mapped.financial_account_id = item.financialAccountId;
    if (item.debitAccountId) mapped.debit_account_id = item.debitAccountId;
    if (item.creditAccountId) mapped.credit_account_id = item.creditAccountId;

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

            // GST Fields
            if (item.invoiceNumber) mapped.invoice_number = item.invoiceNumber;
            if (item.invoiceDate) mapped.invoice_date = item.invoiceDate;
            if (item.taxableAmount !== undefined) mapped.taxable_amount = item.taxableAmount;
            if (item.cgstRate !== undefined) mapped.cgst_rate = item.cgstRate;
            if (item.cgstAmount !== undefined) mapped.cgst_amount = item.cgstAmount;
            if (item.sgstRate !== undefined) mapped.sgst_rate = item.sgstRate;
            if (item.sgstAmount !== undefined) mapped.sgst_amount = item.sgstAmount;
            if (item.igstRate !== undefined) mapped.igst_rate = item.igstRate;
            if (item.igstAmount !== undefined) mapped.igst_amount = item.igstAmount;
            if (item.cessAmount !== undefined) mapped.cess_amount = item.cessAmount;
            if (item.totalGstAmount !== undefined) mapped.total_gst_amount = item.totalGstAmount;
            if (item.roundOffAmount !== undefined) mapped.round_off_amount = item.roundOffAmount;

            // Payment tracking
            if (item.paidAmount !== undefined) mapped.paid_amount = item.paidAmount;
            if (item.balanceAmount !== undefined) mapped.balance_amount = item.balanceAmount;
            if (Array.isArray(item.settlements)) {
                mapped.settlements = item.settlements.map((s: any) => mapModelToStore('recordsettlement', s));
            }
            break;
        case 'ledger':
            if (item.gstNumber) mapped.gst_number = item.gstNumber;
            if (item.isGstRegistered !== undefined) mapped.is_gst_registered = item.isGstRegistered;
            if (item.billingAddress) mapped.billing_address = item.billingAddress;
            if (item.state) mapped.state = item.state;
            if (item.category) mapped.category = item.category;
            break;
        case 'recordsettlement':
            if (item.recordId) mapped.record_id = item.recordId;
            if (item.settlementDate) mapped.settlement_date = item.settlementDate;
            if (item.amountPaid !== undefined) mapped.amount_paid = item.amountPaid;
            if (item.paymentMode) mapped.payment_mode = item.paymentMode;
            if (item.transactionId) mapped.transaction_id = item.transactionId;
            if (item.financialAccountId) mapped.financial_account_id = item.financialAccountId;
            if (item.financialAccount) mapped.financial_account = item.financialAccount;
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
            if (item.debitAccountId) mapped.debit_account_id = item.debitAccountId;
            if (item.creditMode) mapped.credit_mode = item.creditMode;
            if (item.creditLedgerId) mapped.credit_ledger_id = item.creditLedgerId;
            if (item.creditAccountId) mapped.credit_account_id = item.creditAccountId;
            if (item.debitLedger) mapped.debit_ledger = item.debitLedger;
            if (item.creditLedger) mapped.credit_ledger = item.creditLedger;
            if (item.debitAccount) mapped.debit_account = item.debitAccount;
            if (item.creditAccount) mapped.credit_account = item.creditAccount;
            break;
    }

    return mapped;
};
