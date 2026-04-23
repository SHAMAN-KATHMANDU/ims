import { describe, it, expect } from "vitest";
import {
  BITSET_BYTES,
  EMPTY_BITSET,
  hasBit,
  setBit,
  clearBit,
  orBitset,
  andNotBitset,
  toWire,
  fromWire,
  hasPermission,
  applyImplies,
} from "./bitset";
import {
  PERMISSION_BY_KEY,
  ADMINISTRATOR_BIT,
} from "@/../../packages/shared/src/permissions/catalog";

describe("bitset helpers", () => {
  describe("EMPTY_BITSET", () => {
    it("creates a 64-byte zero buffer", () => {
      const buf = EMPTY_BITSET();
      expect(buf.length).toBe(BITSET_BYTES);
      expect(buf.every((b) => b === 0)).toBe(true);
    });
  });

  describe("hasBit / setBit / clearBit", () => {
    it("starts with all bits clear", () => {
      const buf = EMPTY_BITSET();
      expect(hasBit(buf, 0)).toBe(false);
      expect(hasBit(buf, 100)).toBe(false);
      expect(hasBit(buf, 511)).toBe(false);
    });

    it("sets and clears individual bits", () => {
      const buf = EMPTY_BITSET();
      setBit(buf, 0);
      expect(hasBit(buf, 0)).toBe(true);
      expect(hasBit(buf, 1)).toBe(false);

      setBit(buf, 100);
      expect(hasBit(buf, 100)).toBe(true);

      clearBit(buf, 0);
      expect(hasBit(buf, 0)).toBe(false);
      expect(hasBit(buf, 100)).toBe(true);
    });

    it("handles boundary bits", () => {
      const buf = EMPTY_BITSET();
      setBit(buf, 511); // last bit
      expect(hasBit(buf, 511)).toBe(true);
      expect(buf[63]).toBe(128); // bit 7 of byte 63
    });

    it("throws on out-of-range bits", () => {
      const buf = EMPTY_BITSET();
      expect(() => setBit(buf, -1)).toThrow();
      expect(() => setBit(buf, 512)).toThrow();
      expect(() => clearBit(buf, 512)).toThrow();
    });

    it("returns false for out-of-range hasBit", () => {
      const buf = EMPTY_BITSET();
      expect(hasBit(buf, -1)).toBe(false);
      expect(hasBit(buf, 512)).toBe(false);
    });
  });

  describe("orBitset", () => {
    it("ORs two buffers", () => {
      const a = EMPTY_BITSET();
      const b = EMPTY_BITSET();
      setBit(a, 0);
      setBit(b, 1);

      const result = orBitset(a, b);
      expect(hasBit(result, 0)).toBe(true);
      expect(hasBit(result, 1)).toBe(true);
      expect(hasBit(result, 2)).toBe(false);

      // Original buffers unchanged
      expect(hasBit(a, 1)).toBe(false);
      expect(hasBit(b, 0)).toBe(false);
    });
  });

  describe("andNotBitset", () => {
    it("computes a AND NOT b", () => {
      const a = EMPTY_BITSET();
      const b = EMPTY_BITSET();
      setBit(a, 0);
      setBit(a, 1);
      setBit(a, 2);
      setBit(b, 1);

      const result = andNotBitset(a, b);
      expect(hasBit(result, 0)).toBe(true); // in a, not in b
      expect(hasBit(result, 1)).toBe(false); // in b, so cleared
      expect(hasBit(result, 2)).toBe(true); // in a, not in b
    });
  });

  describe("wire format", () => {
    it("encodes to base64 and decodes", () => {
      const buf = EMPTY_BITSET();
      setBit(buf, 100);
      setBit(buf, 511);

      const wire = toWire(buf);
      expect(typeof wire).toBe("string");

      const decoded = fromWire(wire);
      expect(hasBit(decoded, 100)).toBe(true);
      expect(hasBit(decoded, 511)).toBe(true);
      expect(hasBit(decoded, 0)).toBe(false);
    });
  });

  describe("hasPermission", () => {
    it("returns false for unset permission", () => {
      const buf = EMPTY_BITSET();
      expect(hasPermission(buf, "INVENTORY.PRODUCTS.VIEW")).toBe(false);
    });

    it("returns true for set permission", () => {
      const buf = EMPTY_BITSET();
      const def = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.VIEW")!;
      setBit(buf, def.bit);

      expect(hasPermission(buf, "INVENTORY.PRODUCTS.VIEW")).toBe(true);
    });

    it("returns true for unknown key", () => {
      const buf = EMPTY_BITSET();
      expect(hasPermission(buf, "UNKNOWN.PERM.VIEW")).toBe(false);
    });

    it("returns true for ADMINISTRATOR bit regardless of other bits", () => {
      const buf = EMPTY_BITSET();
      setBit(buf, ADMINISTRATOR_BIT);

      expect(hasPermission(buf, "INVENTORY.PRODUCTS.VIEW")).toBe(true);
      expect(hasPermission(buf, "SALES.SALES.REFUND")).toBe(true);
      expect(hasPermission(buf, "SETTINGS.ADMINISTRATOR")).toBe(true);
    });
  });

  describe("applyImplies", () => {
    it("expands implied permissions", () => {
      const buf = EMPTY_BITSET();
      // INVENTORY.PRODUCTS.CREATE implies INVENTORY.PRODUCTS.VIEW
      const createDef = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.CREATE")!;
      setBit(buf, createDef.bit);

      const expanded = applyImplies(buf);
      expect(hasPermission(expanded, "INVENTORY.PRODUCTS.CREATE")).toBe(true);
      expect(hasPermission(expanded, "INVENTORY.PRODUCTS.VIEW")).toBe(true);
    });

    it("is idempotent", () => {
      const buf = EMPTY_BITSET();
      const createDef = PERMISSION_BY_KEY.get("INVENTORY.PRODUCTS.UPDATE")!;
      setBit(buf, createDef.bit);

      const first = applyImplies(buf);
      const second = applyImplies(first);

      expect(toWire(first)).toBe(toWire(second));
    });

    it("handles multiple implications", () => {
      const buf = EMPTY_BITSET();
      // INVENTORY.TRANSFERS.APPROVE implies INVENTORY.TRANSFERS.VIEW
      const approveDef = PERMISSION_BY_KEY.get("INVENTORY.TRANSFERS.APPROVE")!;
      setBit(buf, approveDef.bit);

      const expanded = applyImplies(buf);
      expect(hasPermission(expanded, "INVENTORY.TRANSFERS.APPROVE")).toBe(true);
      expect(hasPermission(expanded, "INVENTORY.TRANSFERS.VIEW")).toBe(true);
    });
  });
});
