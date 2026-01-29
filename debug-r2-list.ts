import dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const endpoint = (process.env.R2_ENDPOINT || "").replace(/\/$/, ""); // Remove trailing slash from input
const bucketName = process.env.R2_BUCKET_NAME || "";

// Sanitize endpoint to match storage.ts logic
const sanitizedEndpoint = (endpoint.endsWith(bucketName) && bucketName)
    ? endpoint.slice(0, -bucketName.length).replace(/\/$/, "")
    : endpoint;

console.log(`Debug: Original Endpoint: '${process.env.R2_ENDPOINT}'`);
console.log(`Debug: Sanitized Endpoint: '${sanitizedEndpoint}'`);
console.log(`Debug: Bucket Name: '${bucketName}'`);

const r2Client = new S3Client({
    region: "auto",
    endpoint: sanitizedEndpoint,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

async function listFiles() {
    console.log("🔍 Listing files in R2 bucket...");
    console.log("=====================================\n");

    try {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
        });
        const response = await r2Client.send(command);

        console.log(`✅ Successfully connected to bucket: ${bucketName}`);
        console.log(`\n📦 Files found (${response.KeyCount || 0}):`);

        // Write to JSON file for reliable inspection
        fs.writeFileSync('r2_files.json', JSON.stringify(response.Contents || [], null, 2));
        console.log("📝 File list written to r2_files.json");

        if (response.Contents && response.Contents.length > 0) {
            response.Contents.forEach((item, index) => {
                console.log(`  ${index + 1}. [${item.LastModified?.toISOString()}] ${item.Key} (${item.Size} bytes)`);
            });
        } else {
            console.log("  No files found in the bucket.");
        }

    } catch (error: any) {
        console.error("❌ Failed to list files:");
        console.error(`  Error: ${error.message}`);
        console.error(`\nPlease check your R2 credentials and bucket permission.`);
    }
}

listFiles();
