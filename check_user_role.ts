
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'pateljignesh15@gmail.com'
    console.log(`Checking data for: ${email}`)

    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            memberships: true
        }
    })

    if (!user) {
        console.log("User not found!")
    } else {
        console.log("User found:", user)
        console.log("Memberships:", user.memberships)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
