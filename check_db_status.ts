
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Connecting to database...");
        const userCount = await prisma.user.count();
        console.log(`Successfully connected! User count: ${userCount}`);

        const orgCount = await prisma.organization.count();
        console.log(`Organization count: ${orgCount}`);
    } catch (e) {
        console.error("Database connection failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
