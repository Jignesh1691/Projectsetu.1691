
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        console.log("ERROR: .env file not found");
        process.exit(1);
    }

    const content = fs.readFileSync(envPath, 'utf8');

    const hasDbUrl = content.includes('DATABASE_URL=');
    const hasDirectUrl = content.includes('DIRECT_URL=');

    console.log(`DATABASE_URL present: ${hasDbUrl}`);
    console.log(`DIRECT_URL present: ${hasDirectUrl}`);

    // Check for common format errors (like starting with psql '...)
    const dbLine = content.split('\n').find(l => l.startsWith('DATABASE_URL='));
    if (dbLine) {
        const val = dbLine.split('=')[1].trim();
        if (val.startsWith('"psql') || val.startsWith('psql')) {
            console.log("WARNING: DATABASE_URL appears to contain 'psql' command prefix, which is invalid for Prisma.");
        }
    }

} catch (e) {
    console.error(e);
}
