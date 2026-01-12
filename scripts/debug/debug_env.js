
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env');
const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

lines.forEach(line => {
    if (line.startsWith('DATABASE_URL=')) {
        console.log('DATABASE_URL starts with:', line.split('=')[1].substring(0, 15) + '...');
    }
    if (line.startsWith('DIRECT_URL=')) {
        console.log('DIRECT_URL starts with:', line.split('=')[1].substring(0, 15) + '...');
    }
});
