/**
 * Bitset helpers for the 512-bit (64-byte) permission bitset used by RBAC.
 *
 * Wire format: base64-encoded 64-byte buffer.
 * Bit numbering: bit `n` lives in byte `n >> 3`, mask `1 << (n & 7)` (LSB-first).
 *
 * Shared by ui-perm-core and ui-role-mgmt; the API contract is recorded in
 * `RBAC_CONTRACT.md` §4.
 */

import {
  PERMISSION_BY_KEY,
  PERMISSION_BY_BIT,
  ADMINISTRATOR_BIT,
} from "@repo/shared";

export const BITSET_BYTES = 64;
export const BITSET_BITS = BITSET_BYTES * 8; // 512

/** Allocate a zeroed 64-byte bitset. */
export function empty(): Uint8Array {
  return new Uint8Array(BITSET_BYTES);
}

/** Decode a base64 wire string into a fresh Uint8Array, padded / truncated to 64 bytes. */
export function fromBase64(b64: string): Uint8Array {
  const out = empty();
  if (!b64) return out;
  const binary =
    typeof atob === "function"
      ? atob(b64)
      : // Node fallback for SSR/tests
        Buffer.from(b64, "base64").toString("binary");
  const n = Math.min(binary.length, BITSET_BYTES);
  for (let i = 0; i < n; i++) out[i] = binary.charCodeAt(i) & 0xff;
  return out;
}

/** Encode a Uint8Array to a base64 wire string (always 64 bytes outgoing). */
export function toBase64(buf: Uint8Array): string {
  // Right-pad/truncate to 64 bytes for wire safety.
  const normalized = empty();
  normalized.set(buf.subarray(0, BITSET_BYTES));
  if (typeof btoa === "function") {
    let binary = "";
    for (let i = 0; i < normalized.length; i++) {
      binary += String.fromCharCode(normalized[i] ?? 0);
    }
    return btoa(binary);
  }
  return Buffer.from(normalized).toString("base64");
}

/** Non-mutating: returns true if `bit` is set. */
export function hasBit(buf: Uint8Array, bit: number): boolean {
  if (bit < 0 || bit >= BITSET_BITS) return false;
  const byte = buf[bit >> 3] ?? 0;
  return (byte & (1 << (bit & 7))) !== 0;
}

/** Immutable set: returns a new Uint8Array with `bit` turned on. */
export function setBit(buf: Uint8Array, bit: number): Uint8Array {
  if (bit < 0 || bit >= BITSET_BITS) return buf;
  const next = new Uint8Array(buf);
  const idx = bit >> 3;
  next[idx] = (next[idx] ?? 0) | (1 << (bit & 7));
  return next;
}

/** Immutable clear: returns a new Uint8Array with `bit` turned off. */
export function clearBit(buf: Uint8Array, bit: number): Uint8Array {
  if (bit < 0 || bit >= BITSET_BITS) return buf;
  const next = new Uint8Array(buf);
  const idx = bit >> 3;
  next[idx] = (next[idx] ?? 0) & ~(1 << (bit & 7));
  return next;
}

/** Immutable: set or clear a bit. */
export function writeBit(
  buf: Uint8Array,
  bit: number,
  value: boolean,
): Uint8Array {
  return value ? setBit(buf, bit) : clearBit(buf, bit);
}

/** Count how many bits from the given list are set in buf. */
export function popcountBits(buf: Uint8Array, bits: readonly number[]): number {
  let count = 0;
  for (const bit of bits) {
    if (hasBit(buf, bit)) count++;
  }
  return count;
}

/** Deep-equal compare two bitsets. */
export function equals(a: Uint8Array, b: Uint8Array): boolean {
  const len = Math.max(a.length, b.length, BITSET_BYTES);
  for (let i = 0; i < len; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return false;
  }
  return true;
}

/** Bitwise OR: returns a new Uint8Array (a OR b). Does not mutate inputs. */
export function orBitset(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(BITSET_BYTES);
  for (let i = 0; i < BITSET_BYTES; i++) {
    out[i] = (a[i] ?? 0) | (b[i] ?? 0);
  }
  return out;
}

/** Bitwise AND-NOT: returns a new Uint8Array (a AND NOT b). Does not mutate inputs. */
export function andNotBitset(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(BITSET_BYTES);
  for (let i = 0; i < BITSET_BYTES; i++) {
    out[i] = (a[i] ?? 0) & ~(b[i] ?? 0);
  }
  return out;
}

/**
 * Apply `implies` transitively: for every set bit that declares implied bits,
 * OR in those implied bits until the closure stabilises.
 * Returns a new Uint8Array (does not mutate input).
 */
export function applyImplies(buf: Uint8Array): Uint8Array {
  const result = new Uint8Array(buf);
  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = 100;

  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;
    for (let bit = 0; bit < BITSET_BITS; bit++) {
      if (!hasBit(result, bit)) continue;
      const def = PERMISSION_BY_BIT.get(bit);
      if (!def?.implies) continue;
      for (const impliedKey of def.implies) {
        const impliedDef = PERMISSION_BY_KEY.get(impliedKey);
        if (impliedDef && !hasBit(result, impliedDef.bit)) {
          const idx = impliedDef.bit >> 3;
          result[idx] = (result[idx] ?? 0) | (1 << (impliedDef.bit & 7));
          changed = true;
        }
      }
    }
  }

  return result;
}

/**
 * Returns true if the permission `key` is granted in `buf`.
 * ADMINISTRATOR bit (511) bypasses all permission checks.
 * Returns false for unknown keys.
 */
export function hasPermission(buf: Uint8Array, key: string): boolean {
  if (hasBit(buf, ADMINISTRATOR_BIT)) return true;
  const def = PERMISSION_BY_KEY.get(key);
  if (!def) return false;
  return hasBit(buf, def.bit);
}
