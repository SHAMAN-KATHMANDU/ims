import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  LEGACY_SESSION_KEY_STORAGE,
  sessionKeyStorage,
  generateSessionKey,
  loadOrCreateSessionKey,
} from "./cart-session";

// Mock localStorage for node environment
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

// Replace window.localStorage with our mock
Object.defineProperty(global, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

describe("cart-session helpers", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    mockLocalStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    mockLocalStorage.clear();
  });

  // ── sessionKeyStorage ──────────────────────────────────────────────────────

  describe("sessionKeyStorage", () => {
    it("returns tenant-scoped key", () => {
      const key = sessionKeyStorage("tenant-123");
      expect(key).toBe("tenant-site:cart-session:tenant-123");
    });

    it("returns different keys for different tenants", () => {
      const key1 = sessionKeyStorage("tenant-1");
      const key2 = sessionKeyStorage("tenant-2");
      expect(key1).not.toBe(key2);
    });
  });

  // ── generateSessionKey ─────────────────────────────────────────────────────

  describe("generateSessionKey", () => {
    it("generates a key at least 8 characters long", () => {
      const key = generateSessionKey();
      expect(key.length).toBeGreaterThanOrEqual(8);
    });

    it("generates different keys on successive calls", () => {
      const key1 = generateSessionKey();
      const key2 = generateSessionKey();
      expect(key1).not.toBe(key2);
    });
  });

  // ── loadOrCreateSessionKey ─────────────────────────────────────────────────

  describe("loadOrCreateSessionKey — first visit", () => {
    it("generates and stores a key on first visit", () => {
      const key = loadOrCreateSessionKey("tenant-1");
      expect(key.length).toBeGreaterThanOrEqual(8);
      const stored = localStorage.getItem(sessionKeyStorage("tenant-1"));
      expect(stored).toBe(key);
    });

    it("returns the same key on successive calls (same tenant)", () => {
      const key1 = loadOrCreateSessionKey("tenant-1");
      const key2 = loadOrCreateSessionKey("tenant-1");
      expect(key2).toBe(key1);
    });
  });

  describe("loadOrCreateSessionKey — returning visit", () => {
    it("returns the stored key", () => {
      const first = loadOrCreateSessionKey("tenant-1");
      const second = loadOrCreateSessionKey("tenant-1");
      expect(second).toBe(first);
    });
  });

  describe("loadOrCreateSessionKey — legacy migration", () => {
    it("adopts legacy key if present", () => {
      // Simulate an old session key stored at the legacy location
      const legacyKey = "legacy-session-key-12345";
      localStorage.setItem(LEGACY_SESSION_KEY_STORAGE, legacyKey);

      const key = loadOrCreateSessionKey("tenant-1");
      expect(key).toBe(legacyKey);

      // Should now be stored under the tenant-scoped key
      const stored = localStorage.getItem(sessionKeyStorage("tenant-1"));
      expect(stored).toBe(legacyKey);

      // Legacy key should be removed
      const legacyRemoved = localStorage.getItem(LEGACY_SESSION_KEY_STORAGE);
      expect(legacyRemoved).toBeNull();
    });

    it("ignores legacy key if it's too short", () => {
      // Store a short/invalid legacy key
      localStorage.setItem(LEGACY_SESSION_KEY_STORAGE, "short");

      const key = loadOrCreateSessionKey("tenant-1");
      // Should generate a new key instead
      expect(key.length).toBeGreaterThanOrEqual(8);
      expect(key).not.toBe("short");

      // Legacy key should still be removed
      const legacyRemoved = localStorage.getItem(LEGACY_SESSION_KEY_STORAGE);
      expect(legacyRemoved).toBeNull();
    });
  });

  describe("loadOrCreateSessionKey — different tenants", () => {
    it("stores different keys for different tenants", () => {
      const key1 = loadOrCreateSessionKey("tenant-1");
      const key2 = loadOrCreateSessionKey("tenant-2");

      expect(key1).not.toBe(key2);
      expect(localStorage.getItem(sessionKeyStorage("tenant-1"))).toBe(key1);
      expect(localStorage.getItem(sessionKeyStorage("tenant-2"))).toBe(key2);
    });
  });

  describe("loadOrCreateSessionKey — localStorage errors", () => {
    // Spy on the mock object itself: `Storage.prototype` only exists in
    // browser-like environments (and, incidentally, very new Node), so a
    // prototype spy passes locally but breaks on CI's Node runtime.
    it("returns a generated key when localStorage.getItem throws", () => {
      const getItemSpy = vi
        .spyOn(mockLocalStorage, "getItem")
        .mockImplementation(() => {
          throw new Error("Storage unavailable");
        });

      const key = loadOrCreateSessionKey("tenant-1");
      expect(key.length).toBeGreaterThanOrEqual(8);

      getItemSpy.mockRestore();
    });

    it("returns a generated key when localStorage throws on setItem", () => {
      const setItemSpy = vi
        .spyOn(mockLocalStorage, "setItem")
        .mockImplementation(() => {
          throw new Error("Storage full");
        });

      const key = loadOrCreateSessionKey("tenant-1");
      expect(key.length).toBeGreaterThanOrEqual(8);

      setItemSpy.mockRestore();
    });
  });
});
