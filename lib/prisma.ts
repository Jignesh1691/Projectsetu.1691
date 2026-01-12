
import { PrismaClient } from "@prisma/client";

let connectionString = process.env.DATABASE_URL || "";

// Sanitize: remove surrounding quotes if present (common .env issue)
if ((connectionString.startsWith('"') && connectionString.endsWith('"')) ||
    (connectionString.startsWith("'") && connectionString.endsWith("'"))) {
    connectionString = connectionString.slice(1, -1);
}

if (!connectionString && process.env.NODE_ENV === 'development') {
    console.error("CRITICAL ERROR: DATABASE_URL is missing or empty.");
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
