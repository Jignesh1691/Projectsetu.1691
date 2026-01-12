
try {
    const output = require('dotenv').config();
    if (output.error) {
        console.error("Dotenv config error:", output.error);
    } else {
        console.log("Dotenv parsed:", Object.keys(output.parsed || {}));
    }
    console.log("DATABASE_URL in process.env:", !!process.env.DATABASE_URL);
} catch (e) {
    console.error("Failed to require dotenv:", e.message);
}
