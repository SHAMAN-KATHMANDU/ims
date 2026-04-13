import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env";
import { Readable } from "stream";

const PRESIGN_EXPIRES_SECONDS = 3600;

let client: S3Client | null = null;

export function getS3Client(): S3Client | null {
  if (!env.photosS3Configured) return null;
  if (!client) {
    client = new S3Client({ region: env.awsRegion });
  }
  return client;
}

function assertS3ConfiguredForMutation(): S3Client {
  const c = getS3Client();
  if (!c) {
    throw new Error("S3_NOT_CONFIGURED");
  }
  return c;
}

async function readableToBuffer(body: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** HeadBucket to verify credentials and bucket access (startup / ops). */
export async function verifyS3Connectivity(): Promise<void> {
  const c = assertS3ConfiguredForMutation();
  await c.send(new HeadBucketCommand({ Bucket: env.photosS3Bucket }));
}

export async function presignPutObject(
  key: string,
  contentType: string,
  contentLength: number,
): Promise<{ url: string; expiresAt: string }> {
  const c = assertS3ConfiguredForMutation();
  const cmd = new PutObjectCommand({
    Bucket: env.photosS3Bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  const url = await getSignedUrl(c, cmd, {
    expiresIn: PRESIGN_EXPIRES_SECONDS,
  });
  const expiresAt = new Date(
    Date.now() + PRESIGN_EXPIRES_SECONDS * 1000,
  ).toISOString();
  return { url, expiresAt };
}

/**
 * Read the first bytes of an uploaded object (for optional content sniff on register).
 */
export async function getS3ObjectFirstBytes(
  key: string,
  maxBytes: number,
): Promise<Buffer> {
  const c = assertS3ConfiguredForMutation();
  const end = Math.max(0, maxBytes - 1);
  const resp = await c.send(
    new GetObjectCommand({
      Bucket: env.photosS3Bucket,
      Key: key,
      Range: `bytes=0-${end}`,
    }),
  );
  const body = resp.Body;
  if (!body) {
    throw new Error("S3_EMPTY_BODY");
  }
  return readableToBuffer(body as Readable);
}

/**
 * Delete object when S3 is configured. Throws on SDK/network errors.
 * Callers must guard with env.photosS3Configured for HTTP semantics (503 vs skip).
 */
export async function deleteS3Object(key: string): Promise<void> {
  const c = assertS3ConfiguredForMutation();
  await c.send(
    new DeleteObjectCommand({
      Bucket: env.photosS3Bucket,
      Key: key,
    }),
  );
}

export function isS3CredentialsOrPermissionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as {
    name?: string;
    Code?: string;
    code?: string;
    __type?: string;
  };
  if (e.name === "CredentialsProviderError") return true;
  const code = e.Code ?? e.code ?? "";
  if (
    code === "AccessDenied" ||
    code === "InvalidAccessKeyId" ||
    code === "SignatureDoesNotMatch"
  ) {
    return true;
  }
  return false;
}
