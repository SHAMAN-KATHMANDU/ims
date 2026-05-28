/**
 * Report storage: file I/O, signed URLs, token validation.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

const REPORTS_DIR = path.join(process.cwd(), "data", "reports");
const TOKEN_TTL_SECONDS = 3600; // 1 hour

/**
 * Signed token payload: includes reportId, tenantId, format, and expiry.
 */
interface SignedTokenPayload {
  reportId: string;
  tenantId: string;
  format: "pdf" | "excel";
  iat: number;
  exp: number;
}

/**
 * Ensure reports directory exists.
 */
export async function ensureReportsDir(): Promise<void> {
  try {
    await fs.promises.mkdir(REPORTS_DIR, { recursive: true });
  } catch (error) {
    logger.error("Failed to create reports directory", undefined, error);
    throw error;
  }
}

/**
 * Save a report file (PDF or Excel) and return the file path.
 */
export async function saveReportFile(
  tenantId: string,
  reportId: string,
  format: "pdf" | "excel",
  buffer: Buffer,
): Promise<string> {
  await ensureReportsDir();

  const reportDir = path.join(REPORTS_DIR, tenantId, reportId);
  await fs.promises.mkdir(reportDir, { recursive: true });

  const fileName = format === "pdf" ? "report.pdf" : "report.xlsx";
  const filePath = path.join(reportDir, fileName);

  await fs.promises.writeFile(filePath, buffer);
  logger.log(`Saved ${format.toUpperCase()} report: ${filePath}`);

  return filePath;
}

/**
 * Read a report file by tenantId, reportId, and format.
 * Returns null if file not found.
 */
export async function readReportFile(
  tenantId: string,
  reportId: string,
  format: "pdf" | "excel",
): Promise<Buffer | null> {
  const fileName = format === "pdf" ? "report.pdf" : "report.xlsx";
  const filePath = path.join(REPORTS_DIR, tenantId, reportId, fileName);

  try {
    const buffer = await fs.promises.readFile(filePath);
    return buffer;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    logger.error(`Error reading report file ${filePath}`, undefined, error);
    throw error;
  }
}

/**
 * Generate a signed download URL for a report.
 * Returns { token, expiresAt }.
 */
export function generateSignedDownloadUrl(
  reportId: string,
  tenantId: string,
  format: "pdf" | "excel",
  baseUrl: string,
): { url: string; expiresAt: string } {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + TOKEN_TTL_SECONDS;

  const payload: SignedTokenPayload = {
    reportId,
    tenantId,
    format,
    iat: now,
    exp,
  };

  // Use JWT_SECRET or fall back to a default for dev
  const secret = env.jwtSecret || "dev-secret";
  const token = jwt.sign(payload, secret);

  const url = new URL(baseUrl);
  url.pathname = `/api/v1/reports/${reportId}/download`;
  url.searchParams.append("token", token);
  url.searchParams.append("format", format);

  const expiresAt = new Date(exp * 1000).toISOString();
  return { url: url.toString(), expiresAt };
}

/**
 * Validate a signed download token and return its payload.
 * Throws on invalid/expired token.
 */
export function validateDownloadToken(
  token: string,
): SignedTokenPayload & jwt.JwtPayload {
  const secret = env.jwtSecret || "dev-secret";
  const payload = jwt.verify(token, secret) as SignedTokenPayload &
    jwt.JwtPayload;
  return payload;
}

/**
 * Clean up old report files (older than maxAgeHours).
 * Runs asynchronously in the background.
 */
export async function cleanupOldReports(
  maxAgeHours: number = 24,
): Promise<void> {
  try {
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();

    const tenantDirs = await fs.promises.readdir(REPORTS_DIR);

    for (const tenantId of tenantDirs) {
      const tenantPath = path.join(REPORTS_DIR, tenantId);
      const reportDirs = await fs.promises.readdir(tenantPath);

      for (const reportId of reportDirs) {
        const reportPath = path.join(tenantPath, reportId);
        const stats = await fs.promises.stat(reportPath);

        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.promises.rm(reportPath, { recursive: true, force: true });
          logger.log(`Cleaned up old report: ${reportPath}`);
        }
      }
    }
  } catch (error) {
    logger.error("Error cleaning up old reports", undefined, error);
    // Do not throw; cleanup is best-effort
  }
}
