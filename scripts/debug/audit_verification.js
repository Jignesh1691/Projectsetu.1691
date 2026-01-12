const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- DATABASE AUDIT ---');
        console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'FOUND' : 'NOT FOUND');

        const userCount = await prisma.user.count();
        console.log('Total Users:', userCount);

        const users = await prisma.user.findMany({
            take: 5
        });

        console.log('\n--- LATEST USERS ---');
        users.forEach(u => {
            console.log(`Email: ${u.email} | Status: ${u.status} | Verified: ${u.emailVerified}`);
        });

        const tokenCount = await prisma.verificationToken.count();
        console.log('\nTotal Tokens:', tokenCount);

        const tokens = await prisma.verificationToken.findMany({
            take: 5
        });

        console.log('\n--- VERIFICATION TOKENS ---');
        tokens.forEach(t => {
            console.log(`Email: ${t.identifier} | Expires: ${t.expires}`);
        });

    } catch (e) {
        console.error('Audit Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
