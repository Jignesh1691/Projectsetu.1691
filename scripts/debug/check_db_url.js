const fs = require('fs');
require('dotenv').config();

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
const dbLine = lines.find(l => l.includes('DATABASE_URL'));

console.log('Full DATABASE_URL line:');
console.log(dbLine);
console.log('\nParsed value:');
console.log(process.env.DATABASE_URL);
