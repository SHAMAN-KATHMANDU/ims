/**
 * Bitset helper tests — mirrors coverage of the API's bitset.test.ts but
 * operates on Uint8Array (browser-safe) instead of Node Buffer.
 */

import { describe, it, expect } from "vitest";
import {
  BITSET_BYTES,
  BITSET_BITS,
  empty,
  hasBit,
  setBit,
  clearBit,
  writeBit,
  fromBase64,
  toBase64,
  orBitset,
  andNotBitset,
  applyImplies,
  hasPermission,
  equals,
  popcountBits,
} from "./bitset";
import { PERMISSION_BY_KEY, ADMINISTRATOR_BIT } from "@repo/shared";

// ─── Constants ────────────────────────────────────────────────────────────────

describe("BITSET_BYTES / BITSET_BITS", () => {
  it("is 64 bytes / 512 bits", () => {
    expect(BITSET_BYTES).toBe(64);
    expect(BITSET_BITS).toBe(512);
  });
});

// ─── empty() ─────────────────────────────────────────────────────────────────

describe("empty()", () => {
  it("creates a 64-byte zeroed Uint8Array", () => {
    const buf = empty();
    expect(buf.byteLength).toBe(BITSET_BYTES);
    expect(buf.every((b) => b === 0)).toBe(true);
  });

  it("returns independent instances", () => {
    const a = empty();
    const b = empty();
    a[0] = 1;
    expect(b[0]).toBe(0);
  });
});

// ─── hasBit / setBit / clearBit ───────────────────────────────────────────────

describe("hasBit / setBit / clearBit", () => {
  it("all bits start clear in empty buffer", () => {
    const buf = empty();
    expect(hasBit(buf, 0)).toBe(false);
    expect(hasBit(buf, 100)).toBe(false);
    expect(hasBit(buf, 511)).toBe(false);
  });

  it("sets and checks individual bits", () => {
    const buf = empty();
    const next = setBit(buf, 0);
    expect(hasBit(next, 0)).toBe(true);
    expect(hasBit(next, 1)).toBe(false);
  });

  it("does not mutate the original buffer", () => {
    const buf = empty();
    setBit(buf, 5);
    expect(hasBit(buf, 5)).toBe(false); // setBit is immutable
  });

  it("handles boundary bit 511 (ADMINISTRATOR)", () => {
    const buf = empty();
    const next = setBit(buf, 511);
    expect(hasBit(next, 511)).toBe(true);
    // Bit 511 = byte 63, bit 7
    expect(next[63]).toBe(128);
  });

  it("clearBit removes a set bit", () => {
    const a = setBit(empty(), 10);
    expect(hasBit(a, 10)).toBe(true);
    const b = clearBit(a, 10);
    expect(hasBit(b, 10)).toBe(false);
    // Original unchanged
    expect(hasBit(a, 10)).toBe(true);
  });

  it("hasBit returns false for out-of-range bits", () => {
    const buf = empty();
    expect(hasBit(buf, -1)).toBe(false);
    expect(hasBit(buf, 512)).toBe(false);
    expect(hasBit(buf, 999)).toBe(false);
  });

  it("setBit / clearBit on out-of-range returns original buffer", () => {
    const buf = empty();
    const result = setBit(buf, -1);
    expect(result).toBe(buf); // same reference
  });
});

// ─── writeBit ─────────────────────────────────────────────────────────────────

describe("writeBit()", () => {
  it("sets when value=true", () => {
    const buf = empty();
    const next = writeBit(buf, 7, true);
    expect(hasBit(next, 7)).toBe(true);
  });

  it("clears when value=false", () => {
    const buf = setBit(empty(), 7);
    const next = writeBit(buf, 7, false);
    expect(hasBit(next, 7)).toBe(false);
  });
});

// ─── orBitset ─────────────────────────────────────────────────────────────────

describe("orBitset()", () => {
  it("ORs two bitsets without mutating inputs", () => {
    const a = setBit(empty(), 0);
    const b = setBit(empty(), 1);
    const result = orBitset(a, b);
    expect(hasBit(result, 0)).toBe(true);
    expect(hasBit(result, 1)).toBe(true);
    expect(hasBit(result, 2)).toBe(false);
    // originals unchanged
    expect(hasBit(a, 1)).toBe(false);
    expect(hasBit(b, 0)).toBe(false);
  });

  it("OR with empty is identity", () => {
    const a = setBit(empty(), 100);
    const result = orBitset(a, empty());
    expect(hasBit(result, 100)).toBe(true);
  });
});

// ─── andNotBitset ─────────────────────────────────────────────────────────────

describe("andNotBitset()", () => {
  it("computes a AND NOT b", () => {
    const a = setBit(setBit(setBit(empty(), 0), 1), 2);
    const b = setBit(empty(), 1);
    const result = andNotBitset(a, b);
    expect(hasBit(result, 0)).toBe(true); // in a, not b
    expect(hasBit(result, 1)).toBe(false); // in b, cleared
    expect(hasBit(result, 2)).toBe(true); // in a, not b
  });

  it("AND_NOT with empty is identity", () => {
    const a = setBit(empty(), 50);
    const result = andNotBitset(a, empty());
    expect(hasBit(result, 50)).toBe(true);
  });
});

// ─── toBase64 / fromBase64 ────────────────────────────────────────────────────

describe("toBase64 / fromBase64", () => {
  it("round-trips bits through base64", () => {
    const original = setBit(setBit(empty(), 100), 511);
    const wire = toBase64(original);
    expect(typeof wire).toBe("string");
    const decoded = fromBase64(wire);
    expect(hasBit(decoded, 100)).toBe(true);
    expect(hasBit(decoded, 511)).toBe(true);
    expect(hasBit(decoded, 0)).toBe(false);
  });

  it("fromBase64 with empty string returns zeroed buffer", () => {
    const buf = fromBase64("");
    expect(buf.every((b) => b === 0)).toBe(true);
  });

  it("toBase64 always produces 64-byte encoded output", () => {
    const wire = toBase64(empty());
    // 64 bytes → base64 length is ceil(64/3)*4 = 88
    expect(wire.length).toBe(88);
  });
});

// ─── hasPermission ────────────────────────────────────────────────────────────

describe("hasPermission()", () => {
  it("returns false when permission bit is not set", () => {
    const buf = empty();
    expect(hasPermission(buf, "INVENTORY.PRODUCTS.VIEW")).toBe(false);
  });

  it("returns true when the specific bit is set", () => {
    const def = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.VIEW")!;
    const buf = setBit(empty(), def.bit);
    expect(hasPermission(buf, "INVENTORY.PRODUCTS.VIEW")).toBe(true);
  });

  it("returns false for an unknown key", () => {
    const buf = setBit(empty(), 0);
    expect(hasPermission(buf, "UNKNOWN.MODULE.VIEW")).toBe(false);
  });

  it("ADMINISTRATOR bit bypasses all checks", () => {
    const buf = setBit(empty(), ADMINISTRATOR_BIT);
    expect(hasPermission(buf, "INVENTORY.PRODUCTS.VIEW")).toBe(true);
    expect(hasPermission(buf, "SALES.SALES.REFUND")).toBe(true);
    expect(hasPermission(buf, "SETTINGS.ADMINISTRATOR")).toBe(true);
  });

  it("does not grant permission for different bit", () => {
    // Set PRODUCTS.CREATE (bit 1), not VIEW (bit 0)
    const def = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.CREATE")!;
    const buf = setBit(empty(), def.bit);
    // hasPermission only checks the specific bit, not implied bits
    expect(hasPermission(buf, "INVENTORY.PRODUCTS.VIEW")).toBe(false);
  });
});

// ─── applyImplies ─────────────────────────────────────────────────────────────

describe("applyImplies()", () => {
  it("expands CREATE → VIEW implication", () => {
    const createDef = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.CREATE")!;
    const buf = setBit(empty(), createDef.bit);
    const expanded = applyImplies(buf);
    expect(hasPermission(expanded, "INVENTORY.PRODUCTS.CREATE")).toBe(true);
    expect(hasPermission(expanded, "INVENTORY.PRODUCTS.VIEW")).toBe(true);
  });

  it("expands APPROVE → VIEW implication", () => {
    const approveDef = PERMISSION_BY_KEY.get("INVENTORY.TRANSFERS.APPROVE")!;
    const buf = setBit(empty(), approveDef.bit);
    const expanded = applyImplies(buf);
    expect(hasPermission(expanded, "INVENTORY.TRANSFERS.APPROVE")).toBe(true);
    expect(hasPermission(expanded, "INVENTORY.TRANSFERS.VIEW")).toBe(true);
  });

  it("does not mutate the input buffer", () => {
    const createDef = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.CREATE")!;
    const original = setBit(empty(), createDef.bit);
    const viewDef = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.VIEW")!;
    expect(hasBit(original, viewDef.bit)).toBe(false);
    applyImplies(original);
    expect(hasBit(original, viewDef.bit)).toBe(false); // still false — not mutated
  });

  it("is idempotent", () => {
    const def = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.UPDATE")!;
    const buf = setBit(empty(), def.bit);
    const once = applyImplies(buf);
    const twice = applyImplies(once);
    expect(toBase64(once)).toBe(toBase64(twice));
  });

  it("handles a buffer with no implications (only VIEW bits)", () => {
    const viewDef = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.VIEW")!;
    const buf = setBit(empty(), viewDef.bit);
    const expanded = applyImplies(buf);
    // VIEW has no implies → bitset unchanged
    expect(toBase64(buf)).toBe(toBase64(expanded));
  });
});

// ─── equals ───────────────────────────────────────────────────────────────────

describe("equals()", () => {
  it("empty buffers are equal", () => {
    expect(equals(empty(), empty())).toBe(true);
  });

  it("different buffers are not equal", () => {
    const a = setBit(empty(), 5);
    expect(equals(a, empty())).toBe(false);
  });

  it("same bits set are equal", () => {
    const a = setBit(empty(), 100);
    const b = setBit(empty(), 100);
    expect(equals(a, b)).toBe(true);
  });
});

// ─── popcountBits ─────────────────────────────────────────────────────────────

describe("popcountBits()", () => {
  it("counts set bits from the list", () => {
    const buf = setBit(setBit(empty(), 0), 2);
    expect(popcountBits(buf, [0, 1, 2, 3])).toBe(2);
  });

  it("returns 0 for empty list", () => {
    const buf = setBit(empty(), 0);
    expect(popcountBits(buf, [])).toBe(0);
  });
});
