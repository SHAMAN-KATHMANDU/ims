import crypto from "crypto";
import { env } from "@/config/env";
import { createError } from "@/middlewares/errorHandler";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const CRED_KEY_HEX64 = /^[0-9a-fA-F]{64}$/;

function requireCredentialEncryptionKey(): Buffer {
  const hex = env.credentialEncryptionKey;
  if (!CRED_KEY_HEX64.test(hex)) {
    throw createError(
      "CREDENTIAL_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes). Set it in the API environment to connect Messenger.",
      503,
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns base64(iv + authTag + ciphertext).
 */
export function encrypt(plaintext: string): string {
  const key = requireCredentialEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Decrypt a base64-encoded ciphertext created by encrypt().
 */
export function decrypt(encryptedBase64: string): string {
  const key = requireCredentialEncryptionKey();
  const buffer = Buffer.from(encryptedBase64, "base64");

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}
