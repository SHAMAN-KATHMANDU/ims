import FileType from "file-type";
import fs from "fs";

/** MIME types allowed for messaging media after magic-byte verification */
export const MESSAGING_MEDIA_MAGIC_ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export function messagingMediaKind(
  mime: string,
): "image" | "video" {
  return mime.startsWith("video/") ? "video" : "image";
}

/**
 * Verify file on disk matches an allowed image/video type (not extension alone).
 */
export async function validateMessagingMediaMagicBytes(
  absolutePath: string,
): Promise<{ mime: string } | null> {
  const detected = await FileType.fromFile(absolutePath);
  if (!detected?.mime || !MESSAGING_MEDIA_MAGIC_ALLOWED.has(detected.mime)) {
    return null;
  }
  return { mime: detected.mime };
}

export function unlinkSilent(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}
