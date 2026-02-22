import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { env } from "@/config/env";

const hasObjectStorageConfig = Boolean(
  env.storageEndpoint && env.storageAccessKey && env.storageSecretKey,
);

const s3Client = hasObjectStorageConfig
  ? new S3Client({
      endpoint: env.storageEndpoint,
      region: env.storageRegion,
      forcePathStyle: env.storageForcePathStyle,
      credentials: {
        accessKeyId: env.storageAccessKey,
        secretAccessKey: env.storageSecretKey,
      },
    })
  : null;

export function objectStorageEnabled(): boolean {
  return Boolean(s3Client);
}

export async function uploadBufferObject(
  key: string,
  body: Buffer,
  contentType?: string,
): Promise<void> {
  if (!s3Client) {
    throw new Error("Object storage is not configured");
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.storageBucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  if (!s3Client) return;
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: env.storageBucket,
      Key: key,
    }),
  );
}

export async function ensureStorageBucket(): Promise<void> {
  if (!s3Client) return;
  try {
    await s3Client.send(
      new HeadBucketCommand({
        Bucket: env.storageBucket,
      }),
    );
  } catch {
    await s3Client.send(
      new CreateBucketCommand({
        Bucket: env.storageBucket,
      }),
    );
  }
}
