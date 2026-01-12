# ProjectSetu 🏗️

**ProjectSetu** is a professional construction management platform designed for multi-tenant data isolation, real-time financial tracking, and AI-powered document processing.

## 🔥 Key Features

- **AI Bill Scanning**: Automatically extract data from construction bills and receipts using Gemini 2.5 Flash.
- **Approval Workflow**: A robust request-approval system for all financial and operational changes.
- **Financial Tracking**: Deep ledger management for income, expenses, payables, and receivables.
- **PWA Ready**: Optimized for mobile field use with safe-area support and manifest integration.
- **Labor & Hajari**: Specialized modules for tracking daily labor attendance and project settlements.
- **Material Management**: Inventory tracking and project-level material ledgers.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Neon Database](https://neon.tech/))
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [NextAuth.js v5](https://authjs.dev/)
- **State Management**: [Zustand-like Modular Store](src/lib/store/)
- **AI Integration**: [Genkit](https://firebase.google.com/docs/genkit) + [Google AI](https://ai.google.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/)

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+
- A Neon Database (or any PostgreSQL instance)

### 2. Environment Setup
Create a `.env` file in the root with:
```env
DATABASE_URL="your-postgresql-url"
AUTH_SECRET="your-auth-secret"
GOOGLE_GENAI_API_KEY="your-gemini-api-key"
```

### 3. Installation
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

## 📂 Project Structure

- `src/app`: Next.js routes and API endpoints.
- `src/components`: UI components and forms.
- `src/lib/store`: Modularized global state management.
- `src/prisma`: Database schema and seed scripts.
- `src/ai`: Genkit flows and AI configurations.

## 🛡️ Security
- Role-Based Access Control (RBAC)
- Multi-tenant data row isolation via Prisma queries.
- Password hashing with Bcrypt.

---
*Built with ❤️ for Modern Construction Management.*
