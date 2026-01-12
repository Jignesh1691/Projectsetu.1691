const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkUser() {
    try {
        const users = await prisma.user.findMany({
            include: {
                memberships: {
                    include: {
                        organization: true
                    }
                }
            }
        });

        console.log('\n=== Users in Database ===\n');
        users.forEach(user => {
            console.log(`Email: ${user.email}`);
            console.log(`Status: ${user.status}`);
            console.log(`Created: ${user.createdAt}`);
            console.log('Memberships:');
            user.memberships.forEach(m => {
                console.log(`  - Organization: ${m.organization.name}`);
                console.log(`    Role: ${m.role}`);
            });
            console.log('---\n');
        });

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
    }
}

checkUser();
