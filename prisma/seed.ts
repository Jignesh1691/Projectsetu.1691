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
