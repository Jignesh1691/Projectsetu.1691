import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // Create Organization
    const org = await prisma.organization.upsert({
        where: { slug: 'acme' },
        update: {},
        create: {
            name: 'Acme Corp',
            slug: 'acme',
        },
    });
    console.log(`✅ Organization created: ${org.name} (${org.slug})`);

    // Create Admin User
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const admin = await prisma.user.upsert({
        where: {
            email: 'admin@acme.com'
        },
        update: {
            password: hashedPassword,
            status: 'ACTIVE',
            emailVerified: new Date(), // Set emailVerified so admin can login
        },
        create: {
            email: 'admin@acme.com',
            name: 'Admin User',
            password: hashedPassword,
            status: 'ACTIVE',
            emailVerified: new Date(), // Set emailVerified so admin can login
        },
    });
    console.log(`✅ Admin user created: ${admin.email}`);

    // Create Membership
    await prisma.membership.upsert({
        where: {
            userId_organizationId: {
                userId: admin.id,
                organizationId: org.id
            }
        },
        update: { role: 'ADMIN' },
        create: {
            userId: admin.id,
            organizationId: org.id,
            role: 'ADMIN',
        },
    });
    console.log(`✅ Admin membership assigned`);

    // Create Project
    const project = await prisma.project.upsert({
        where: { id: 'project-alpha' }, // Fixed ID for testing
        update: {},
        create: {
            id: 'project-alpha',
            name: 'Alpha Project',
            // status field does not exist on Project model
            organizationId: org.id,
            location: 'Bangalore',
        },
    });
    console.log(`✅ Project created: ${project.name}`);

    // Assign Admin to Project
    await prisma.projectUser.createMany({
        data: [{
            userId: admin.id,
            projectId: project.id,
            status: 'active',
        }],
        skipDuplicates: true,
    });

    // Create Ledger
    const ledger = await prisma.ledger.upsert({
        where: { id: 'ledger-general' }, // Fixed ID for testing
        update: {},
        create: {
            id: 'ledger-general',
            name: 'General Expenses',
            // type field does not exist on Ledger model
            organizationId: org.id,
        },
    });
    console.log(`✅ Ledger created: ${ledger.name}`);

    console.log('🚀 Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
