import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const s3Client = new S3Client({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

export async function uploadFile(
    file: File,
    fileName: string
): Promise<string> {
    if (!process.env.AWS_S3_BUCKET_NAME) {
        throw new Error("AWS_S3_BUCKET_NAME is not configured");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: file.type,
        },
    });

    await upload.done();

    // Return the public URL
    const publicUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
    if (publicUrl) {
        // Ensure publicUrl doesn't have a trailing slash
        const baseUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
        return `${baseUrl}/${fileName}`;
    }

    // Fallback to S3 direct URL if public URL is not provided
    const region = process.env.AWS_REGION || "us-east-1";
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${region}.amazonaws.com/${fileName}`;
}

export async function deleteFile(fileName: string) {
    // Implementation for deletion if needed
}
