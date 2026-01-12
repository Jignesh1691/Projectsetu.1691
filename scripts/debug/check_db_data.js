const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkData() {
    try {
        console.log('\n=== ORGANIZATIONS ===');
        const orgs = await prisma.organization.findMany();
        orgs.forEach(org => {
            console.log(`Name: "${org.name}"`);
            console.log(`Slug: "${org.slug}"`);
            console.log(`ID: ${org.id}`);
            console.log('---');
        });

        console.log('\n=== USERS ===');
        const users = await prisma.user.findMany({
            include: {
                memberships: {
                    include: {
                        organization: true
                    }
                }
            }
        });

        users.forEach(user => {
            console.log(`Email: ${user.email}`);
            console.log(`Status: ${user.status}`);
            console.log(`Name: ${user.name}`);
            user.memberships.forEach(m => {
                console.log(`  - Membership ID: ${m.id}`);
                console.log(`    Role: ${m.role}`);
                console.log(`    Org: ${m.organization.name} (slug: "${m.organization.slug}")`);
            });
            console.log('---');
        });

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error.message);
        await prisma.$disconnect();
    }
}

checkData();
