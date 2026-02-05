import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    forcePathStyle: true,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin123',
    },
});

const BUCKET = process.env.S3_BUCKET || 'contracts';

export async function uploadToS3(key: string, body: Buffer, contentType: string = 'application/pdf') {
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    }));
    return key;
}

export async function getSignedUrl(key: string, expiresIn = 3600) {
    const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
    });
    return awsGetSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteFromS3(key: string) {
    await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
    }));
}

// Alias for backwards compatibility
export const getSignedDownloadUrl = getSignedUrl;
