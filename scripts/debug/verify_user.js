const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Checking database...');
    try {
        const user = await prisma.user.findFirst({
            where: { email: 'admin@acme.com' }
        });
        if (user) {
            console.log('User FOUND:', user.email);
        } else {
            console.log('User NOT FOUND');
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
