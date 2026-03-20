/**
 * Deletes contact attachment files + DB rows and messaging upload files + clears
 * message mediaPayload for items older than {@link UPLOAD_RETENTION_DAYS}.
 * Runs daily at 4:00 AM (after trash cleanup).
 */

import path from "path";
import cron from "node-cron";
import { Prisma } from "@prisma/client";
import { basePrisma } from "@/config/prisma";
import { logger } from "@/config/logger";
import { unlinkSilent } from "@/modules/messaging/messaging-upload.validation";

/**
 * Some editors resolve `@prisma/client` without the full generated delegate list, so
 * `PrismaClient` appears to omit `message`. Intersect an explicit `message` API for this job.
 */
type UploadCleanupDb = typeof basePrisma & {
  message: {
    findMany(args: {
      where: Record<string, unknown>;
      take: number;
      orderBy: { id: "asc" };
      select: {
        id: true;
        mediaPayload: true;
        textContent: true;
        contentType: true;
      };
    }): Promise<
      Array<{
        id: string;
        mediaPayload: unknown;
        textContent: string | null;
        contentType: string;
      }>
    >;
    update(args: {
      where: { id: string };
      data: Record<string, unknown>;
    }): Promise<unknown>;
  };
};

export const UPLOAD_RETENTION_DAYS = 7;

const BATCH_SIZE = 200;

export function getUploadCleanupCutoff(): Date {
  const d = new Date();
  d.setDate(d.getDate() - UPLOAD_RETENTION_DAYS);
  return d;
}

/**
 * Resolves a stored messaging media URL (absolute https or /uploads/messaging/...)
 * to an on-disk path under `uploads/messaging/`, or null if not a local upload.
 */
export function resolveLocalMessagingMediaAbsolutePath(
  rawUrl: unknown,
): string | null {
  if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
  const url = rawUrl.trim();
  let pathname: string;
  try {
    if (/^https?:\/\//i.test(url)) {
      pathname = new URL(url).pathname;
    } else {
      pathname = url.startsWith("/") ? url : `/${url}`;
    }
  } catch {
    return null;
  }
  const marker = "/uploads/messaging/";
  const idx = pathname.indexOf(marker);
  if (idx === -1) return null;
  const rel = pathname.slice(idx + 1);
  const segments = rel.split("/").filter(Boolean);
  if (segments.length < 3) return null;
  if (segments[0] !== "uploads" || segments[1] !== "messaging") return null;
  if (segments.some((s) => s === "..")) return null;
  return path.join(process.cwd(), ...segments);
}

function absolutePathForContactAttachment(filePath: string): string | null {
  const trimmed = filePath.replace(/^\/+/, "");
  if (!trimmed || trimmed.includes("..")) return null;
  const segments = trimmed.split("/").filter(Boolean);
  if (segments[0] !== "attachments") return null;
  return path.join(process.cwd(), "uploads", ...segments);
}

type MediaPayloadShape = { url?: unknown };

function isNonTextContentType(
  t: string,
): t is "IMAGE" | "VIDEO" | "AUDIO" | "FILE" {
  return t === "IMAGE" || t === "VIDEO" || t === "AUDIO" || t === "FILE";
}

export async function runUploadCleanup(): Promise<void> {
  const cutoff = getUploadCleanupCutoff();
  const db = basePrisma as UploadCleanupDb;
  logger.log(
    `[UploadCleanup] Running for items created before ${cutoff.toISOString()} (${UPLOAD_RETENTION_DAYS}d retention)`,
  );

  let attachmentsDeleted = 0;
  let messagesCleared = 0;

  for (;;) {
    const batch = await db.contactAttachment.findMany({
      where: { createdAt: { lt: cutoff } },
      take: BATCH_SIZE,
      select: { id: true, filePath: true },
    });
    if (batch.length === 0) break;

    for (const row of batch) {
      const abs = absolutePathForContactAttachment(row.filePath);
      if (abs) {
        unlinkSilent(abs);
      } else {
        logger.warn(
          `[UploadCleanup] Skipping unsafe attachment path: ${row.filePath}`,
        );
      }
    }

    const result = await basePrisma.contactAttachment.deleteMany({
      where: { id: { in: batch.map((b) => b.id) } },
    });
    attachmentsDeleted += result.count;
  }

  if (attachmentsDeleted > 0) {
    logger.log(
      `[UploadCleanup] Removed ${attachmentsDeleted} contact attachment row(s) and file(s)`,
    );
  }

  /** Cursor pagination: rows with only external media URLs are skipped but must not stall the scan. */
  let messageCursorId: string | undefined;
  for (;;) {
    const batch = await db.message.findMany({
      where: {
        createdAt: { lt: cutoff },
        NOT: { mediaPayload: { equals: Prisma.DbNull } },
        ...(messageCursorId ? { id: { gt: messageCursorId } } : {}),
      },
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      select: {
        id: true,
        mediaPayload: true,
        textContent: true,
        contentType: true,
      },
    });
    if (batch.length === 0) break;

    messageCursorId = batch[batch.length - 1]!.id;

    for (const msg of batch) {
      const payload = msg.mediaPayload as MediaPayloadShape | null;
      const url = payload?.url;
      const abs = resolveLocalMessagingMediaAbsolutePath(url);
      if (!abs) {
        continue;
      }

      unlinkSilent(abs);

      const hasText =
        typeof msg.textContent === "string" && msg.textContent.trim().length > 0;

      const data = {
        mediaPayload: Prisma.DbNull,
        ...(isNonTextContentType(msg.contentType)
          ? {
              contentType: "TEXT" as const,
              ...(!hasText
                ? { textContent: "[Media no longer available]" as const }
                : {}),
            }
          : {}),
      };

      await db.message.update({
        where: { id: msg.id },
        data,
      });
      messagesCleared += 1;
    }
  }

  if (messagesCleared > 0) {
    logger.log(
      `[UploadCleanup] Cleared local media on ${messagesCleared} message(s)`,
    );
  }

  logger.log("[UploadCleanup] Complete");
}

export function startUploadCleanupCron(): void {
  cron.schedule("0 4 * * *", async () => {
    try {
      await runUploadCleanup();
    } catch (error) {
      logger.error("[UploadCleanup] Fatal error in cron job", undefined, error);
    }
  });

  logger.log("[UploadCleanup] Scheduled daily at 4:00 AM");
}
