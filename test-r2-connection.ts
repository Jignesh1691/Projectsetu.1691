import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

// Load environment variables from .env first, then .env.local
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || "",
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

async function testR2Connection() {
    console.log("🔍 Testing Cloudflare R2 Connection...\n");

    // Check environment variables
    console.log("📋 Environment Variables:");
    console.log(`   R2_ENDPOINT: ${process.env.R2_ENDPOINT ? "✅ Set" : "❌ Missing"}`);
    console.log(`   R2_ACCESS_KEY_ID: ${process.env.R2_ACCESS_KEY_ID ? "✅ Set" : "❌ Missing"}`);
    console.log(`   R2_SECRET_ACCESS_KEY: ${process.env.R2_SECRET_ACCESS_KEY ? "✅ Set" : "❌ Missing"}`);
    console.log(`   R2_BUCKET_NAME: ${process.env.R2_BUCKET_NAME ? "✅ Set" : "❌ Missing"}`);
    console.log(`   NEXT_PUBLIC_R2_PUBLIC_URL: ${process.env.NEXT_PUBLIC_R2_PUBLIC_URL ? "✅ Set" : "❌ Missing"}\n`);

    // Check if all required variables are set
    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
        console.log("❌ Missing required environment variables. Please check your .env file.\n");
        return;
    }

    try {
        // Attempt to list buckets (this validates credentials)
        console.log("🔗 Attempting to connect to R2...");
        const command = new ListBucketsCommand({});
        const response = await r2Client.send(command);

        console.log("✅ Connection successful!\n");
        console.log(`📦 Found ${response.Buckets?.length || 0} bucket(s):`);

        if (response.Buckets && response.Buckets.length > 0) {
            response.Buckets.forEach((bucket, index) => {
                console.log(`   ${index + 1}. ${bucket.Name} (Created: ${bucket.CreationDate?.toISOString()})`);
            });
        }

        // Check if the configured bucket exists
        if (process.env.R2_BUCKET_NAME) {
            const bucketExists = response.Buckets?.some(b => b.Name === process.env.R2_BUCKET_NAME);
            console.log(`\n🎯 Configured bucket "${process.env.R2_BUCKET_NAME}": ${bucketExists ? "✅ Found" : "❌ Not found"}`);
        }

        console.log("\n✨ Cloudflare R2 is properly configured and connected!");
    } catch (error: any) {
        console.log("❌ Connection failed!\n");
        console.error("Error details:", error.message);

        if (error.Code === "InvalidAccessKeyId") {
            console.log("\n💡 Tip: Check your R2_ACCESS_KEY_ID");
        } else if (error.Code === "SignatureDoesNotMatch") {
            console.log("\n💡 Tip: Check your R2_SECRET_ACCESS_KEY");
        } else if (error.message.includes("ENOTFOUND")) {
            console.log("\n💡 Tip: Check your R2_ENDPOINT URL");
        }
    }
}

testR2Connection();
