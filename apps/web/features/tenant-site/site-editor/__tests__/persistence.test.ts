import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getPersistedDraft,
  persistDraft,
  clearPersistedDraft,
} from "../store/persistence";
import type { BlockNode } from "@repo/shared";

describe("persistence", () => {
  const tenantId = "tenant-1";
  const scope = "home";

  let storageMock: Record<string, string>;

  beforeEach(() => {
    storageMock = {};
    global.localStorage = {
      getItem: (key: string) => storageMock[key] ?? null,
      setItem: (key: string, value: string) => {
        storageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete storageMock[key];
      },
      clear: () => {
        storageMock = {};
      },
      key: (_index: number) => null,
      length: 0,
    } as Storage;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("persistDraft", () => {
    it("stores a draft in localStorage", () => {
      const blocks: BlockNode[] = [{ id: "1", kind: "section", props: {} }];
      persistDraft(tenantId, scope, blocks);

      const key = `siteEditor.draft.${tenantId}.${scope}`;
      expect(storageMock[key]).toBeDefined();
    });

    it("saves blocks with a timestamp", () => {
      const blocks: BlockNode[] = [
        {
          id: "1",
          kind: "heading" as const,
          props: { text: "Title" },
        } as BlockNode,
      ];
      const beforeTime = Date.now();
      persistDraft(tenantId, scope, blocks);
      const afterTime = Date.now();

      const key = `siteEditor.draft.${tenantId}.${scope}`;
      const stored = JSON.parse(storageMock[key]!);
      expect(stored.blocks).toEqual(blocks);
      expect(stored.savedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(stored.savedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("getPersistedDraft", () => {
    it("retrieves a saved draft", () => {
      const blocks: BlockNode[] = [{ id: "1", kind: "section", props: {} }];
      persistDraft(tenantId, scope, blocks);

      const retrieved = getPersistedDraft(tenantId, scope);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.blocks).toEqual(blocks);
    });

    it("returns null when no draft exists", () => {
      const retrieved = getPersistedDraft(tenantId, "nonexistent-scope");
      expect(retrieved).toBeNull();
    });

    it("returns null for malformed JSON", () => {
      const key = `siteEditor.draft.${tenantId}.${scope}`;
      storageMock[key] = "not valid json";

      const retrieved = getPersistedDraft(tenantId, scope);
      expect(retrieved).toBeNull();
    });

    it("handles missing savedAt gracefully", () => {
      const key = `siteEditor.draft.${tenantId}.${scope}`;
      const blocks: BlockNode[] = [
        { id: "1", kind: "section" as const, props: {} } as BlockNode,
      ];
      storageMock[key] = JSON.stringify({ blocks });

      const retrieved = getPersistedDraft(tenantId, scope);
      expect(retrieved?.blocks).toEqual(blocks);
    });
  });

  describe("clearPersistedDraft", () => {
    it("removes a saved draft", () => {
      const blocks: BlockNode[] = [{ id: "1", kind: "section", props: {} }];
      persistDraft(tenantId, scope, blocks);

      const key = `siteEditor.draft.${tenantId}.${scope}`;
      expect(storageMock[key]).toBeDefined();

      clearPersistedDraft(tenantId, scope);
      expect(storageMock[key]).toBeUndefined();
    });

    it("is a no-op when draft doesn't exist", () => {
      clearPersistedDraft(tenantId, "nonexistent-scope");
      // Should not throw
    });
  });

  describe("storage key format", () => {
    it("uses the exact key format: siteEditor.draft.${tenantId}.${scope}", () => {
      const blocks: BlockNode[] = [{ id: "1", kind: "section", props: {} }];
      persistDraft("tenant-x", "product-detail", blocks);

      const expectedKey = "siteEditor.draft.tenant-x.product-detail";
      expect(storageMock[expectedKey]).toBeDefined();
    });

    it("supports different scopes independently", () => {
      const blocks1: BlockNode[] = [
        { id: "1", kind: "section" as const, props: {} } as BlockNode,
      ];
      const blocks2: BlockNode[] = [
        {
          id: "2",
          kind: "heading" as const,
          props: { text: "Different" },
        } as BlockNode,
      ];

      persistDraft(tenantId, "home", blocks1);
      persistDraft(tenantId, "product-detail", blocks2);

      const retrieved1 = getPersistedDraft(tenantId, "home");
      const retrieved2 = getPersistedDraft(tenantId, "product-detail");

      expect(retrieved1?.blocks[0]?.id).toBe("1");
      expect(retrieved2?.blocks[0]?.id).toBe("2");
    });

    it("supports different tenants independently", () => {
      const blocks: BlockNode[] = [{ id: "1", kind: "section", props: {} }];

      persistDraft("tenant-a", scope, blocks);
      persistDraft("tenant-b", scope, [
        { id: "2", kind: "heading", props: {} },
      ]);

      const retrievedA = getPersistedDraft("tenant-a", scope);
      const retrievedB = getPersistedDraft("tenant-b", scope);

      expect(retrievedA?.blocks[0]?.id).toBe("1");
      expect(retrievedB?.blocks[0]?.id).toBe("2");
    });
  });

  describe("handles localStorage unavailability", () => {
    beforeEach(() => {
      global.localStorage = undefined as unknown as Storage;
    });

    it("persistDraft returns gracefully", () => {
      const blocks: BlockNode[] = [{ id: "1", kind: "section", props: {} }];
      expect(() => persistDraft(tenantId, scope, blocks)).not.toThrow();
    });

    it("getPersistedDraft returns null", () => {
      const retrieved = getPersistedDraft(tenantId, scope);
      expect(retrieved).toBeNull();
    });

    it("clearPersistedDraft returns gracefully", () => {
      expect(() => clearPersistedDraft(tenantId, scope)).not.toThrow();
    });
  });
});
