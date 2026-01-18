import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
    console.log('Testing connection to:', process.env.DATABASE_URL?.split('@')[1] || 'URL MISSING');

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ Successfully connected to PostgreSQL!');
        const res = await client.query('SELECT NOW()');
        console.log('Server time:', res.rows[0].now);
        await client.end();
    } catch (err) {
        console.error('❌ Connection failed:', err);
    }
}

testConnection();
