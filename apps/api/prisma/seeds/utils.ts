import * as crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

/**
 * Generate a deterministic UUID from a namespace and key.
 * Same inputs always produce the same ID (for idempotent upserts).
 */
export function deterministicId(namespace: string, key: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${namespace}:${key}`)
    .digest();
  const hex = hash.subarray(0, 16);
  return [
    hex.subarray(0, 4).toString("hex"),
    hex.subarray(4, 6).toString("hex"),
    hex.subarray(6, 8).toString("hex"),
    hex.subarray(8, 10).toString("hex"),
    hex.subarray(10, 16).toString("hex"),
  ].join("-");
}

/**
 * Hash password for seeded users (matches app: bcrypt 10 rounds).
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/** True if plain text matches a bcrypt hash (same rounds as hashPassword). */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Current period for subscriptions: start = now, end = +1 month.
 */
export function getSubscriptionPeriod(): {
  periodStart: Date;
  periodEnd: Date;
} {
  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  return { periodStart, periodEnd };
}

/**
 * Deterministic sale code for seeds (SL-YYYYMMDD-XXXX).
 */
export function deterministicSaleCode(index: number): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = String(index).padStart(4, "0").slice(-4);
  return `SL-${dateStr}-${suffix}`;
}

/**
 * Deterministic transfer code for seeds (TRF-{prefix}-{index}).
 */
export function deterministicTransferCode(
  prefix: string,
  index: number,
): string {
  return `TRF-${prefix}-${String(index).padStart(3, "0")}`;
}

/**
 * Add days to a date (returns new Date).
 */
export function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

/**
 * Require env var or throw.
 */
export function requireEnv(name: string, value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required env: ${name}. Set it in .env (see .env.example).`,
    );
  }
  return value.trim();
}
