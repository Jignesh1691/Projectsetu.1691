
const { execSync } = require('child_process');
require('dotenv').config();

console.log("DEBUG: DATABASE_URL status:", process.env.DATABASE_URL ? "Present" : "Missing");

try {
    // Use shell option for windows compatibility
    execSync('npx prisma generate', {
        stdio: 'inherit',
        env: { ...process.env },
        shell: true
    });
} catch (e) {
    console.error("Generation failed");
    process.exit(1);
}
