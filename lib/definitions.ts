
export type Role = 'admin' | 'user';
export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  password?: string;
  mustChangePassword?: boolean;
  organizationName?: string;
};

export type UserOption = {
  id: string;
  name: string | null;
  email: string;
};

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';

export type Project = {
  id: string;
  name: string;
  location?: string | null;
  status: ProjectStatus;
  organization_id: string;
  created_at: string;
  updated_at: string;
};

export type ProjectUserStatus = 'active' | 'inactive';

export type ProjectUser = {
  project_id: string;
  user_id: string;
  status: ProjectUserStatus;
}

export type Ledger = Approvable & {
  name: string;
  category?: RecordType;
  gst_number?: string;
  is_gst_registered: boolean;
  billing_address?: string;
  state?: string;
  pending_data?: Partial<Omit<Ledger, 'id' | 'approval_status' | 'pending_data'>>;
};

export type TransactionType = 'income' | 'expense';

export type PaymentMode = 'cash' | 'bank';

export type ApprovalStatus = 'approved' | 'pending-edit' | 'pending-delete' | 'pending-create' | 'rejected';

type Approvable = {
  id: string;
  approval_status?: ApprovalStatus;
  created_by?: string; // ID of user who created the item
  submitted_by?: string; // ID of user who made the change request
  remarks?: string; // Remarks from the admin on rejection
  request_message?: string; // Message from the user with the request
  rejection_count?: number; // Number of times a change has been rejected
}

export type FinancialAccountType = 'CASH' | 'BANK';

export type FinancialAccount = {
  id: string;
  name: string;
  type: FinancialAccountType;
  accountNumber?: string | null;
  bankName?: string | null;
  ifscCode?: string | null;
  openingBalance: number;
};

export type Transaction = Approvable & {
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  project_id: string;
  ledger_id: string;
  bill_url?: string;
  payment_mode: PaymentMode;
  financial_account_id?: string;
  creator?: UserOption; // Creator information
  pending_data?: Partial<Omit<Transaction, 'id' | 'approval_status' | 'pending_data'>>;
  converted_from_record_id?: string;
  hajari_settlement_id?: string;
};

export type Recordable = Approvable & {
  type: RecordType;
  ledger_id: string;
  description: string;
  amount: number;
  due_date: string;
  status: RecordStatus;
  project_id: string;
  bill_url?: string;
  payment_mode: PaymentMode;
  financial_account_id?: string;

  // GST Invoice Fields
  invoice_number?: string;
  invoice_date?: string;
  taxable_amount?: number;
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
  cess_amount?: number;
  total_gst_amount?: number;
  round_off_amount?: number;

  // Payment tracking
  paid_amount?: number;
  balance_amount?: number;
  settlements?: RecordSettlement[];

  creator?: UserOption; // Creator information
  pending_data?: Partial<Omit<Recordable, 'id' | 'approval_status' | 'pending_data'>>;
};

export type RecordSettlement = {
  id: string;
  record_id: string;
  settlement_date: string;
  amount_paid: number;
  payment_mode: PaymentMode;
  transaction_id?: string;
  financial_account_id?: string;
  remarks?: string;
  created_by: string;
  created_at: string;
  financial_account?: FinancialAccount;
};

export interface JournalEntry {
  id: string;
  date: string | Date;
  description: string;
  amount: number;
  debit_mode: 'cash' | 'bank' | 'ledger';
  debit_ledger_id?: string;
  debit_account_id?: string;
  credit_mode: 'cash' | 'bank' | 'ledger';
  credit_ledger_id?: string;
  credit_account_id?: string;
  created_by: string;
  created_at?: string | Date;
  // Relations
  debit_ledger?: { id: string, name: string };
  credit_ledger?: { id: string, name: string };
  debit_account?: { id: string, name: string };
  credit_account?: { id: string, name: string };
  creator?: UserOption;
}

export type RecordType = 'income' | 'expense';

export type RecordStatus = 'pending' | 'partial' | 'paid';



export type Photo = Approvable & {
  project_id: string;
  image_url: string;
  description: string;
  created_at: string;
  file?: File; // For newly uploaded files before they reach the DB
  pending_data?: Partial<Omit<Photo, 'id' | 'approval_status' | 'pending_data'>>;
};

export type Document = Approvable & {
  project_id: string;
  document_url: string;
  document_name: string;
  description: string;
  created_at: string;
  file?: File; // For newly uploaded files before they reach the DB
  pending_data?: Partial<Omit<Document, 'id' | 'approval_status' | 'pending_data'>>;
};

export type LaborType = 'laborer' | 'foreman';

export type Labor = {
  id: string;
  name: string;
  type: LaborType;
  rate: number; // Daily rate
};

export type AttendanceStatus = 'present' | 'absent' | 'half-day' | 'settlement' | 'pending-settlement';

export type Hajari = Approvable & {
  labor_id: string;
  project_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  overtime_hours: number;
  upad: number; // Advances or settlement amount
};

export type TaskStatus = 'todo' | 'in-progress' | 'done';

export type Task = Approvable & {
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  due_date?: string;
  pending_data?: Partial<Omit<Task, 'id' | 'approval_status' | 'pending_data'>>;
};

export type Notification = {
  id: string;
  user_id: string; // The user who should see this notification
  message: string;
  item_id: string;
  item_type: string;
  type: string; // 'approved', 'rejected', 'submitted', 'info'
  created_at: string;
  is_read: boolean;
};

export type Material = Approvable & {
  name: string;
  unit: string;
  pending_data?: Partial<Omit<Material, 'id' | 'approval_status' | 'pending_data'>>;
};

export type MaterialLedgerEntry = Approvable & {
  material_id: string;
  project_id: string;
  date: string;
  type: 'in' | 'out';
  quantity: number;
  description?: string;
  challan_url?: string;
  pending_data?: Partial<Omit<MaterialLedgerEntry, 'id' | 'approval_status' | 'pending_data'>>;
};



