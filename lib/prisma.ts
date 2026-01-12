
import { PrismaClient } from "@prisma/client";

let connectionString = process.env.DATABASE_URL || "";

// Sanitize: remove surrounding quotes if present (common .env issue)
if ((connectionString.startsWith('"') && connectionString.endsWith('"')) ||
    (connectionString.startsWith("'") && connectionString.endsWith("'"))) {
    connectionString = connectionString.slice(1, -1);
}

if (!connectionString) {
    console.error("CRITICAL WARNING: DATABASE_URL is missing or empty. Using dummy connection string for build.");
    // Fallback to prevent build-time crash on Vercel. 
    // attempts to connect will fail, but the build process (collecting page data) might succeed if it doesn't query DB.
    connectionString = "postgresql://dummy:dummy@localhost:5432/dummy";
}

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: connectionString,
            },
        },
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
};

// Ensure clean client instance management
declare const globalThis: {
    prismaGlobal: PrismaClient | undefined;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
    globalThis.prismaGlobal = prisma;
}
