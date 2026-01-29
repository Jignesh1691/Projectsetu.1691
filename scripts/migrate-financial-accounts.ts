import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration for Financial Accounts...');

    // 1. Get all organizations
    const organizations = await prisma.organization.findMany();
    console.log(`Found ${organizations.length} organizations.`);

    for (const org of organizations) {
        console.log(`\nProcessing Organization: ${org.name} (${org.id})`);

        // 2. Create or Find Default Accounts
        // Cash Account
        let cashAccount = await prisma.financialAccount.findFirst({
            where: { organizationId: org.id, name: 'Default Cash', type: 'CASH' }
        });

        if (!cashAccount) {
            console.log(' - Creating Default Cash Account...');
            cashAccount = await prisma.financialAccount.create({
                data: {
                    name: 'Default Cash',
                    type: 'CASH',
                    organizationId: org.id,
                    openingBalance: 0,
                }
            });
        } else {
            console.log(' - Default Cash Account exists.');
        }

        // Bank Account
        let bankAccount = await prisma.financialAccount.findFirst({
            where: { organizationId: org.id, name: 'Default Bank', type: 'BANK' }
        });

        if (!bankAccount) {
            console.log(' - Creating Default Bank Account...');
            bankAccount = await prisma.financialAccount.create({
                data: {
                    name: 'Default Bank',
                    type: 'BANK',
                    organizationId: org.id,
                    openingBalance: 0,
                }
            });
        } else {
            console.log(' - Default Bank Account exists.');
        }

        // 3. Migrate Transactions
        console.log(' - Migrating Transactions...');
        const cashTransactions = await prisma.transaction.updateMany({
            where: {
                organizationId: org.id,
                paymentMode: 'cash',
                financialAccountId: null
            },
            data: { financialAccountId: cashAccount.id }
        });
        console.log(`   Updated ${cashTransactions.count} Cash Transactions.`);

        const bankTransactions = await prisma.transaction.updateMany({
            where: {
                organizationId: org.id,
                paymentMode: 'bank',
                financialAccountId: null
            },
            data: { financialAccountId: bankAccount.id }
        });
        console.log(`   Updated ${bankTransactions.count} Bank Transactions.`);

        // 4. Migrate Records (if applicable - usually records are pending, but if paid/partially paid maybe?)
        // Records have paymentMode but only meaningful if status is paid? 
        // Assuming we update all for consistency if they have a mode set.
        console.log(' - Migrating Records...');
        const cashRecords = await prisma.record.updateMany({
            where: {
                organizationId: org.id,
                paymentMode: 'cash',
                financialAccountId: null
            },
            data: { financialAccountId: cashAccount.id }
        });
        console.log(`   Updated ${cashRecords.count} Cash Records.`);

        const bankRecords = await prisma.record.updateMany({
            where: {
                organizationId: org.id,
                paymentMode: 'bank',
                financialAccountId: null
            },
            data: { financialAccountId: bankAccount.id }
        });
        console.log(`   Updated ${bankRecords.count} Bank Records.`);

        // 5. Migrate Journal Entries
        console.log(' - Migrating Journal Entries...');

        // Debit Side (Cash/Bank)
        const debitCash = await prisma.journalEntry.updateMany({
            where: { organizationId: org.id, debitMode: 'cash', debitAccountId: null },
            data: { debitAccountId: cashAccount.id }
        });
        console.log(`   Updated ${debitCash.count} Journal Debits (Cash).`);

        const debitBank = await prisma.journalEntry.updateMany({
            where: { organizationId: org.id, debitMode: 'bank', debitAccountId: null },
            data: { debitAccountId: bankAccount.id }
        });
        console.log(`   Updated ${debitBank.count} Journal Debits (Bank).`);

        // Credit Side (Cash/Bank)
        const creditCash = await prisma.journalEntry.updateMany({
            where: { organizationId: org.id, creditMode: 'cash', creditAccountId: null },
            data: { creditAccountId: cashAccount.id }
        });
        console.log(`   Updated ${creditCash.count} Journal Credits (Cash).`);

        const creditBank = await prisma.journalEntry.updateMany({
            where: { organizationId: org.id, creditMode: 'bank', creditAccountId: null },
            data: { creditAccountId: bankAccount.id }
        });
        console.log(`   Updated ${creditBank.count} Journal Credits (Bank).`);

    }

    console.log('\nMigration Completed Successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
