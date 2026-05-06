import { describe, it, expect } from "vitest";
import {
  deriveEditorMode,
  contentEntryPath,
  designEntryPath,
} from "./editor-mode";

describe("editor-mode", () => {
  describe("deriveEditorMode", () => {
    it("treats the workspace root as content", () => {
      expect(deriveEditorMode("/admin")).toBe("content");
    });

    it("treats /content as content", () => {
      expect(deriveEditorMode("/admin/content")).toBe("content");
    });

    it("treats CRUD content routes as content", () => {
      expect(deriveEditorMode("/admin/products")).toBe("content");
      expect(deriveEditorMode("/admin/blog")).toBe("content");
      expect(deriveEditorMode("/admin/pages/abc-123")).toBe("content");
    });

    it("treats /site-editor as design", () => {
      expect(deriveEditorMode("/admin/site-editor")).toBe("design");
      expect(deriveEditorMode("/admin/site-editor/home")).toBe("design");
    });

    it("treats /redirects, /domain, /templates as design", () => {
      expect(deriveEditorMode("/admin/redirects")).toBe("design");
      expect(deriveEditorMode("/admin/domain")).toBe("design");
      expect(deriveEditorMode("/admin/templates")).toBe("design");
    });

    it("returns content for empty/malformed paths", () => {
      expect(deriveEditorMode("")).toBe("content");
      expect(deriveEditorMode(null)).toBe("content");
      expect(deriveEditorMode(undefined)).toBe("content");
      expect(deriveEditorMode("/")).toBe("content");
    });
  });

  describe("entry paths", () => {
    it("composes content entry path", () => {
      expect(contentEntryPath("admin")).toBe("/admin/content");
      expect(contentEntryPath("acme-co")).toBe("/acme-co/content");
    });

    it("composes design entry path", () => {
      expect(designEntryPath("admin")).toBe("/admin/site-editor");
    });
  });
});
