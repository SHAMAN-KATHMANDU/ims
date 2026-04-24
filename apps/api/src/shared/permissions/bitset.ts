/**
 * Bitset helpers for 512-bit (64-byte) permission buffers.
 * Bit numbering: bit n lives in byte n>>3, mask 1<<(n&7) (LSB-first per byte).
 */

import {
  PERMISSION_BY_KEY,
  PERMISSION_BY_BIT,
  ADMINISTRATOR_BIT,
} from "@repo/shared/src/permissions/catalog";

export const BITSET_BYTES = 64; // 512 bits, append-only growth headroom
export const EMPTY_BITSET = (): Buffer => Buffer.alloc(BITSET_BYTES, 0);

/**
 * Test if a specific bit is set in a buffer.
 */
export function hasBit(buf: Buffer, bit: number): boolean {
  if (bit < 0 || bit >= BITSET_BYTES * 8) return false;
  const byteIdx = bit >> 3;
  const bitMask = 1 << (bit & 7);
  return (buf[byteIdx] & bitMask) !== 0;
}

/**
 * Set a specific bit in a buffer (mutates).
 */
export function setBit(buf: Buffer, bit: number): Buffer {
  if (bit < 0 || bit >= BITSET_BYTES * 8) {
    throw new Error(`Bit ${bit} out of range [0, ${BITSET_BYTES * 8})`);
  }
  const byteIdx = bit >> 3;
  const bitMask = 1 << (bit & 7);
  buf[byteIdx] |= bitMask;
  return buf;
}

/**
 * Clear a specific bit in a buffer (mutates).
 */
export function clearBit(buf: Buffer, bit: number): Buffer {
  if (bit < 0 || bit >= BITSET_BYTES * 8) {
    throw new Error(`Bit ${bit} out of range [0, ${BITSET_BYTES * 8})`);
  }
  const byteIdx = bit >> 3;
  const bitMask = 1 << (bit & 7);
  buf[byteIdx] &= ~bitMask;
  return buf;
}

/**
 * Bitwise OR of two buffers; returns a new buffer.
 */
export function orBitset(a: Buffer, b: Buffer): Buffer {
  const out = Buffer.alloc(BITSET_BYTES, 0);
  for (let i = 0; i < BITSET_BYTES; i++) {
    out[i] = a[i] | b[i];
  }
  return out;
}

/**
 * Bitwise AND_NOT (a AND (NOT b)); returns a new buffer.
 */
export function andNotBitset(a: Buffer, b: Buffer): Buffer {
  const out = Buffer.alloc(BITSET_BYTES, 0);
  for (let i = 0; i < BITSET_BYTES; i++) {
    out[i] = a[i] & ~b[i];
  }
  return out;
}

/**
 * Convert buffer to base64 wire format (for JSON).
 */
export function toWire(b: Buffer): string {
  return b.toString("base64");
}

/**
 * Convert base64 wire format back to buffer.
 */
export function fromWire(s: string): Buffer {
  return Buffer.from(s, "base64");
}

/**
 * Test if a permission is granted in a bitset.
 * Returns true if ADMINISTRATOR bit is set or the specific permission bit is set.
 */
export function hasPermission(perms: Buffer, key: string): boolean {
  // ADMINISTRATOR bypasses everything
  if (hasBit(perms, ADMINISTRATOR_BIT)) return true;

  const def = PERMISSION_BY_KEY.get(key);
  if (!def) return false;

  return hasBit(perms, def.bit);
}

/**
 * Apply implies transitively: for every bit that is set, OR in the bits
 * it implies. Returns a new buffer with the closure computed.
 */
export function applyImplies(buf: Buffer): Buffer {
  const result = Buffer.from(buf);

  let changed = true;
  let iterations = 0;
  const maxIterations = 100; // prevent infinite loops

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (let bit = 0; bit < BITSET_BYTES * 8; bit++) {
      if (hasBit(result, bit)) {
        const def = PERMISSION_BY_BIT.get(bit);
        if (def?.implies) {
          for (const impliedKey of def.implies) {
            const impliedDef = PERMISSION_BY_KEY.get(impliedKey);
            if (impliedDef && !hasBit(result, impliedDef.bit)) {
              setBit(result, impliedDef.bit);
              changed = true;
            }
          }
        }
      }
    }
  }

  if (iterations >= maxIterations) {
    throw new Error(
      "applyImplies: maximum iterations exceeded (circular implies?)",
    );
  }

  return result;
}
