const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function debugAuth() {
    try {
        console.log('\n=== DATABASE DEBUG ===\n');

        // Check all organizations
        const orgs = await prisma.organization.findMany();
        console.log('Organizations in database:');
        orgs.forEach(org => {
            console.log(`  - Name: "${org.name}", Slug: "${org.slug}"`);
        });

        console.log('\n');

        // Check all users with their memberships
        const users = await prisma.user.findMany({
            include: {
                membership: true,
                organization: true
            }
        });

        console.log('Users in database:');
        users.forEach(user => {
            console.log(`\n  Email: ${user.email}`);
            console.log(`  Status: ${user.status}`);
            console.log(`  Organization: ${user.organization.name} (${user.organization.slug})`);
            console.log(`  Membership exists: ${!!user.membership}`);
            if (user.membership) {
                console.log(`  Role: ${user.membership.role}`);
            } else {
                console.log(`  ⚠️  WARNING: No membership record!`);
            }
        });

        console.log('\n=== END DEBUG ===\n');

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

debugAuth();
