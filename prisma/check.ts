import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const orgs = await prisma.organization.findMany();
    console.log('Organizations:', orgs);
    const users = await prisma.user.findMany();
    console.log('Users:', users.map(u => u.email));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
