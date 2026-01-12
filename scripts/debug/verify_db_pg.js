
require('dotenv').config();
const { Pool } = require('pg');

async function check() {
    console.log("Checking DB connection...");

    // Fallback to DATABASE_URL if DIRECT_URL missing
    const connectionString = process.env.DATABASE_URL; // Use pooled for check

    if (!connectionString) {
        console.error("No DATABASE_URL found in env");
        process.exit(1);
    }

    console.log("URL found (masked):", connectionString.substring(0, 15) + "...");

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false } // Neon often needs this or valid certs
    });

    try {
        const client = await pool.connect();
        console.log("Connected successfully!");

        const res = await client.query('SELECT count(*) FROM "User"'); // Assuming User table exists and is quoted
        console.log("User count:", res.rows[0].count);

        client.release();
    } catch (err) {
        console.error("Connection failed:", err);
        // Try to query current_timestamp to see if connection works at all (table might be missing)
        try {
            const client = await pool.connect();
            const res = await client.query('SELECT NOW()');
            console.log("DB is reachable! Time:", res.rows[0].now);
            client.release();
        } catch (e2) {
            console.error("Fallback connection test failed:", e2);
        }
    } finally {
        await pool.end();
    }
}

check();
