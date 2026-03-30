import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env";

const PRESIGN_EXPIRES_SECONDS = 3600;

let client: S3Client | null = null;

export function getS3Client(): S3Client | null {
  if (!env.photosS3Configured) return null;
  if (!client) {
    client = new S3Client({ region: env.awsRegion });
  }
  return client;
}

export async function presignPutObject(
  key: string,
  contentType: string,
): Promise<{ url: string; expiresAt: string }> {
  const c = getS3Client();
  if (!c) {
    throw new Error("S3_NOT_CONFIGURED");
  }
  const cmd = new PutObjectCommand({
    Bucket: env.photosS3Bucket,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(c, cmd, {
    expiresIn: PRESIGN_EXPIRES_SECONDS,
  });
  const expiresAt = new Date(
    Date.now() + PRESIGN_EXPIRES_SECONDS * 1000,
  ).toISOString();
  return { url, expiresAt };
}

export async function deleteS3Object(key: string): Promise<void> {
  if (!env.photosS3Configured) return;
  const c = getS3Client();
  if (!c) return;
  await c.send(
    new DeleteObjectCommand({
      Bucket: env.photosS3Bucket,
      Key: key,
    }),
  );
}
