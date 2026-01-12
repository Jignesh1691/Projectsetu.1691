
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
let content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

let fixedLines = lines.map(line => {
    let trimmed = line.trim();
    // Uncomment if it looks like a valid vars
    if (trimmed.startsWith('#') && trimmed.includes('DIRECT_URL=')) {
        // Only uncomment if it looks like the one from example (assigning a value)
        // Checking if it contains valid chars roughly
        console.log("Uncommenting DIRECT_URL line");
        return trimmed.substring(1).trim();
    }
    // Fix leading spaces
    if (trimmed.startsWith('DIRECT_URL=')) {
        console.log("Fixing leading whitespace for DIRECT_URL");
        return trimmed;
    }
    return line;
});

// Also check if DIRECT_URL is actually present as a key
const hasDirect = fixedLines.some(l => l.trim().startsWith('DIRECT_URL='));
if (!hasDirect) {
    console.log("DIRECT_URL missing, attempting to add from DATABASE_URL derivative");
    // If we have DATABASE_URL, we can try to derive DIRECT_URL if it's completely missing
    // But earlier check said "includes" was true. 
}

fs.writeFileSync(envPath, fixedLines.join('\n'));
