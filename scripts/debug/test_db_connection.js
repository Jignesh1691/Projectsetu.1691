const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
    const connectionString = process.env.DATABASE_URL;

    console.log('Testing connection to Neon database...');
    console.log('Connection string prefix:', connectionString?.substring(0, 50) + '...');

    const pool = new Pool({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        const client = await pool.connect();
        console.log('✅ Successfully connected to database!');

        const result = await client.query('SELECT NOW()');
        console.log('Current database time:', result.rows[0].now);

        client.release();
        await pool.end();

        console.log('\n✅ Database connection is working correctly!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
            console.log('\n⚠️  Network/DNS issue:');
            console.log('   - Check your internet connection');
            console.log('   - Verify the Neon database hostname is correct');
            console.log('   - Check if your firewall is blocking port 5432');
        } else if (error.code === '28P01') {
            console.log('\n⚠️  Authentication failed:');
            console.log('   - Verify your database username and password');
            console.log('   - Check if the credentials have expired');
        } else {
            console.log('\n⚠️  Other error - check the details above');
        }

        await pool.end();
        process.exit(1);
    }
}

testConnection();
