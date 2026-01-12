
import { prisma } from './lib/prisma';

async function main() {
    console.log("Starting Prisma Debug...");
    try {
        console.log("Asking for user count...");
        const count = await prisma.user.count();
        console.log("Success! Count:", count);
    } catch (e) {
        console.error("Prisma Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
