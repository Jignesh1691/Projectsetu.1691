import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT || "",
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
});

export async function uploadFile(
    file: File,
    fileName: string
): Promise<string> {
    if (!process.env.R2_BUCKET_NAME) {
        throw new Error("R2_BUCKET_NAME is not configured");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const upload = new Upload({
        client: r2Client,
        params: {
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: file.type,
        },
    });

    await upload.done();

    // Return the public URL
    const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    if (publicUrl) {
        // Ensure publicUrl doesn't have a trailing slash
        const baseUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
        return `${baseUrl}/${fileName}`;
    }

    // Fallback to endpoint-based URL if public URL is not provided
    return `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${fileName}`;
}

export async function deleteFile(fileName: string) {
    // Implementation for deletion if needed
}
