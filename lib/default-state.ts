
import type { User } from './definitions';

const defaultAdminUser: User = {
  id: 'admin_user_01',
  name: 'Admin',
  email: 'Admin@projectsetu.com',
  password: 'Admin',
  role: 'admin',
  isActive: true,
};

export const defaultState = {
  users: [defaultAdminUser],
  projects: [],
  project_users: [],
  ledgers: [],
  transactions: [],
  recordables: [],
  photos: [],
  documents: [],
  labors: [],
  hajari_records: [],
  tasks: [],
  notifications: [],
  materials: [],
  material_ledger: [],
  journal_entries: [],
  financial_accounts: [],
};

