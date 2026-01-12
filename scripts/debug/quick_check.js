const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkData() {
    try {
        const count = await prisma.user.count();
        console.log(`Total users: ${count}`);

        if (count > 0) {
            const users = await prisma.user.findMany({
                select: {
                    email: true,
                    status: true,
                    organizationId: true
                }
            });
            console.log('\nUsers:');
            users.forEach(u => console.log(`  - ${u.email} (${u.status})`));

            const memberships = await prisma.membership.findMany({
                select: {
                    userId: true,
                    role: true
                }
            });
            console.log(`\nMemberships: ${memberships.length}`);
            memberships.forEach(m => console.log(`  - User ID: ${m.userId}, Role: ${m.role}`));
        }

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error.message);
        await prisma.$disconnect();
    }
}

checkData();
