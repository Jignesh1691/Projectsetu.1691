
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
    const email = 'pateljignesh15@gmail.com';
    console.log(`Checking user: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            memberships: {
                include: {
                    organization: true
                }
            }
        }
    });

    if (!user) {
        console.log('User not found.');
    } else {
        console.log('User found:', JSON.stringify(user, null, 2));

        const tokens = await prisma.verificationToken.findMany({
            where: { identifier: email },
            orderBy: { expires: 'desc' },
            take: 1
        });

        if (tokens.length > 0) {
            console.log('Verification Token found:', JSON.stringify(tokens[0], null, 2));
            const verificationLink = `${process.env.NEXTAUTH_URL}/api/verify?token=${tokens[0].token}`;
            console.log('Manual Verification Link:', verificationLink);
        } else {
            console.log('No verification token found for this user.');
        }
    }
}

checkUser()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
