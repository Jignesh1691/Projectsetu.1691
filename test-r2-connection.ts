import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

const endpoint = (process.env.R2_ENDPOINT || "").replace(/\/$/, ""); // Remove trailing slash from input
const bucketName = process.env.R2_BUCKET_NAME || "";

// Sanitize endpoint to match storage.ts logic
const sanitizedEndpoint = (endpoint.endsWith(bucketName) && bucketName)
    ? endpoint.slice(0, -bucketName.length).replace(/\/$/, "")
    : endpoint;

console.log(`Debug: Original Endpoint: '${process.env.R2_ENDPOINT}'`);
console.log(`Debug: Sanitized Endpoint: '${sanitizedEndpoint}'`);

const r2Client = new S3Client({
    region: "auto",
    endpoint: sanitizedEndpoint,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

async function testR2Connection() {
    console.log("🔍 Testing Cloudflare R2 Connection...");
    console.log("=====================================\n");

    try {
        console.log("🔌 Testing connection to R2...");
        const command = new ListBucketsCommand({});
        const response = await r2Client.send(command);

        console.log("✅ Successfully connected to Cloudflare R2!");
        console.log(`\n📦 Available buckets (${response.Buckets?.length || 0}):`);

        if (response.Buckets && response.Buckets.length > 0) {
            response.Buckets.forEach((bucket, index) => {
                const isCurrent = bucket.Name === process.env.R2_BUCKET_NAME;
                console.log(`  ${index + 1}. ${bucket.Name} ${isCurrent ? '← Current bucket ✅' : ''}`);
            });
        }
        console.log("\n🎉 R2 is properly connected!");
    } catch (error: any) {
        console.error("❌ Failed to connect to R2:");
        console.error(`  Error: ${error.message}`);
        console.error(`\nPlease check your R2 credentials in the .env file.`);
    }
}

testR2Connection();
