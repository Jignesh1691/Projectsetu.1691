import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findUnique({
        where: { email: 'admin@acme.com' },
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log('✅ User found:', user.email);
    console.log('Status:', user.status);
    console.log('Email Verified:', user.emailVerified);

    const isPasswordValid = await bcrypt.compare('Password123!', user.password || '');
    console.log('Password "Password123!" Valid:', isPasswordValid);
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
