import { describe, it, expect, beforeEach } from "vitest";
import {
  getPersistedDraft,
  clearPersistedDraft,
  buildEditorStorageKey,
} from "./editor-store";
import type { PersistedEditorStateData } from "./editor-store";

beforeEach(() => {
  localStorage.clear();
});

describe("draft recovery helpers", () => {
  it("getPersistedDraft returns null when no draft exists", () => {
    const draft = getPersistedDraft("t1", "home", null);
    expect(draft).toBeNull();
  });

  it("getPersistedDraft returns the persisted state when it exists", () => {
    const tenantId = "t1";
    const scope = "home";
    const pageId = null;
    const key = buildEditorStorageKey(tenantId, scope, pageId);

    const persistedData: PersistedEditorStateData = {
      present: { blocks: [{ id: "a", kind: "hero", props: {} } as never] },
      dirty: true,
      savedAt: 1234567890,
    };
    localStorage.setItem(key, JSON.stringify({ state: persistedData }));

    const draft = getPersistedDraft(tenantId, scope, pageId);
    expect(draft).toEqual(persistedData);
    expect(draft?.dirty).toBe(true);
    expect(draft?.savedAt).toBe(1234567890);
  });

  it("clearPersistedDraft removes the draft from localStorage", () => {
    const tenantId = "t1";
    const scope = "home";
    const pageId = null;
    const key = buildEditorStorageKey(tenantId, scope, pageId);

    const persistedData: PersistedEditorStateData = {
      present: { blocks: [] },
      dirty: true,
      savedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify({ state: persistedData }));

    clearPersistedDraft(tenantId, scope, pageId);

    // Draft should be cleared
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("buildEditorStorageKey formats key correctly without pageId", () => {
    const key = buildEditorStorageKey("t1", "home", null);
    expect(key).toBe("site-editor:t1:home:none");
  });

  it("buildEditorStorageKey formats key correctly with pageId", () => {
    const key = buildEditorStorageKey("t1", "page", "page-123");
    expect(key).toBe("site-editor:t1:page:page-123");
  });

  it("getPersistedDraft returns the draft even when dirty=false", () => {
    const tenantId = "t1";
    const scope = "home";
    const pageId = null;
    const key = buildEditorStorageKey(tenantId, scope, pageId);

    const cleanDraft: PersistedEditorStateData = {
      present: { blocks: [] },
      dirty: false,
      savedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify({ state: cleanDraft }));

    const draft = getPersistedDraft(tenantId, scope, pageId);
    // Draft exists but is not dirty
    expect(draft?.dirty).toBe(false);
  });

  it("getPersistedDraft handles invalid JSON gracefully", () => {
    const tenantId = "t1";
    const scope = "home";
    const pageId = null;
    const key = buildEditorStorageKey(tenantId, scope, pageId);

    localStorage.setItem(key, "invalid json {");

    const draft = getPersistedDraft(tenantId, scope, pageId);
    expect(draft).toBeNull();
  });
});
