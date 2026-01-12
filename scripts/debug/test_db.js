const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Testing connection...');
        const count = await prisma.user.count();
        console.log('User count:', count);
    } catch (e) {
        console.error('Connection Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
