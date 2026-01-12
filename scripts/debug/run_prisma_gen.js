
const { spawn } = require('child_process');
require('dotenv').config();

console.log("Running prisma generate with dotenv loaded vars...");

const env = { ...process.env };
// verify
console.log("DATABASE_URL present:", !!env.DATABASE_URL);
console.log("DIRECT_URL present:", !!env.DIRECT_URL);

// Use shell: true 
const child = spawn('npx', ['prisma', 'generate'], { env, stdio: 'inherit', cwd: process.cwd(), shell: true });

child.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
    process.exit(code);
});
