import dotenv from 'dotenv';
dotenv.config();
import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const endpoint = (process.env.R2_ENDPOINT || "").replace(/\/$/, "");
const bucketName = process.env.R2_BUCKET_NAME || "";

// Sanitize endpoint
const sanitizedEndpoint = (endpoint.endsWith(bucketName) && bucketName)
    ? endpoint.slice(0, -bucketName.length).replace(/\/$/, "")
    : endpoint;

const r2Client = new S3Client({
    region: "auto",
    endpoint: sanitizedEndpoint,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

async function migrateFiles() {
    console.log("🚀 Starting migration of misplaced files...");

    try {
        // List all files
        const listCommand = new ListObjectsV2Command({
            Bucket: bucketName,
        });
        const response = await r2Client.send(listCommand);

        const filesToMigrate = response.Contents?.filter(item => item.Key?.startsWith(`${bucketName}/`)) || [];

        if (filesToMigrate.length === 0) {
            console.log("✅ No misplaced files found. Bucket is clean.");
            return;
        }

        console.log(`found ${filesToMigrate.length} files to migrate.`);

        for (const file of filesToMigrate) {
            if (!file.Key) continue;

            const originalKey = file.Key;
            const newKey = originalKey.replace(`${bucketName}/`, '');

            console.log(`\nProcessing: ${originalKey} -> ${newKey}`);

            // 1. Copy to new location
            console.log("  - Copying...");
            await r2Client.send(new CopyObjectCommand({
                Bucket: bucketName,
                CopySource: `${bucketName}/${originalKey}`, // CopySource must include bucket
                Key: newKey,
                ACL: 'public-read', // Ensure public access
            }));

            // 2. Delete original
            console.log("  - Deleting original...");
            await r2Client.send(new DeleteObjectCommand({
                Bucket: bucketName,
                Key: originalKey,
            }));

            console.log("  ✅ Done.");
        }

        console.log("\n🎉 Migration completed!");

    } catch (error: any) {
        console.error("❌ Migration failed:");
        console.error(error);
    }
}

migrateFiles();
