import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listSiteLayouts,
  getSiteLayout,
  upsertSiteLayoutDraft,
  publishSiteLayout,
  deleteSiteLayout,
  getSiteLayoutPreviewUrl,
  resetSiteLayoutFromTemplate,
  refreshPreviewToken,
} from "./site-layouts.service";

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPost = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((err: unknown) => {
    throw err;
  }),
}));

const sampleLayout = {
  id: "sl1",
  tenantId: "t1",
  scope: "home",
  pageId: null,
  blocks: { blocks: [] },
  draftBlocks: null,
  version: 1,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

describe("site-layouts.service", () => {
  // -------------------------------------------------------------------------
  describe("listSiteLayouts", () => {
    it("calls GET /site-layouts and returns layouts array", async () => {
      mockGet.mockResolvedValue({ data: { layouts: [sampleLayout] } });

      const result = await listSiteLayouts();

      expect(mockGet).toHaveBeenCalledWith("/site-layouts");
      expect(result).toEqual([sampleLayout]);
    });

    it("returns [] when response has no layouts key", async () => {
      mockGet.mockResolvedValue({ data: {} });

      const result = await listSiteLayouts();

      expect(result).toEqual([]);
    });

    it("propagates errors via handleApiError", async () => {
      const err = new Error("Network error");
      mockGet.mockRejectedValue(err);

      await expect(listSiteLayouts()).rejects.toThrow("Network error");
    });
  });

  // -------------------------------------------------------------------------
  describe("getSiteLayout", () => {
    it("calls GET /site-layouts/:scope without pageId", async () => {
      mockGet.mockResolvedValue({ data: { layout: sampleLayout } });

      const result = await getSiteLayout("home");

      expect(mockGet).toHaveBeenCalledWith("/site-layouts/home");
      expect(result).toEqual(sampleLayout);
    });

    it("appends pageId query param when provided", async () => {
      const pageLayout = { ...sampleLayout, scope: "page", pageId: "p1" };
      mockGet.mockResolvedValue({ data: { layout: pageLayout } });

      await getSiteLayout("page", "p1");

      expect(mockGet).toHaveBeenCalledWith("/site-layouts/page?pageId=p1");
    });

    it("URL-encodes the scope", async () => {
      mockGet.mockResolvedValue({ data: { layout: sampleLayout } });

      await getSiteLayout(
        "products-index" as Parameters<typeof getSiteLayout>[0],
      );

      expect(mockGet).toHaveBeenCalledWith("/site-layouts/products-index");
    });

    it("returns null on 404 instead of throwing", async () => {
      const err = { response: { status: 404 } };
      mockGet.mockRejectedValue(err);

      const result = await getSiteLayout("home");

      expect(result).toBeNull();
    });

    it("propagates non-404 errors", async () => {
      const err = new Error("Server error");
      mockGet.mockRejectedValue(err);

      await expect(getSiteLayout("home")).rejects.toThrow("Server error");
    });
  });

  // -------------------------------------------------------------------------
  describe("upsertSiteLayoutDraft", () => {
    it("calls PUT /site-layouts with the full input payload", async () => {
      mockPut.mockResolvedValue({ data: { layout: sampleLayout } });

      const result = await upsertSiteLayoutDraft({
        scope: "home",
        pageId: null,
        blocks: [],
      });

      expect(mockPut).toHaveBeenCalledWith("/site-layouts", {
        scope: "home",
        pageId: null,
        blocks: [],
      });
      expect(result).toEqual(sampleLayout);
    });

    it("propagates errors via handleApiError", async () => {
      const err = new Error("Save failed");
      mockPut.mockRejectedValue(err);

      await expect(
        upsertSiteLayoutDraft({ scope: "home", blocks: [] }),
      ).rejects.toThrow("Save failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("publishSiteLayout", () => {
    it("calls POST /site-layouts/:scope/publish with empty body", async () => {
      const published = { ...sampleLayout, version: 2 };
      mockPost.mockResolvedValue({ data: { layout: published } });

      const result = await publishSiteLayout("home");

      expect(mockPost).toHaveBeenCalledWith("/site-layouts/home/publish", {});
      expect(result.version).toBe(2);
    });

    it("appends pageId query param when provided", async () => {
      mockPost.mockResolvedValue({ data: { layout: sampleLayout } });

      await publishSiteLayout("page", "p1");

      expect(mockPost).toHaveBeenCalledWith(
        "/site-layouts/page/publish?pageId=p1",
        {},
      );
    });

    it("propagates errors via handleApiError", async () => {
      mockPost.mockRejectedValue(new Error("Publish failed"));

      await expect(publishSiteLayout("home")).rejects.toThrow("Publish failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("deleteSiteLayout", () => {
    it("calls DELETE /site-layouts/:scope without pageId", async () => {
      mockDelete.mockResolvedValue({});

      await deleteSiteLayout("home");

      expect(mockDelete).toHaveBeenCalledWith("/site-layouts/home");
    });

    it("appends pageId query param when provided", async () => {
      mockDelete.mockResolvedValue({});

      await deleteSiteLayout("page", "p1");

      expect(mockDelete).toHaveBeenCalledWith("/site-layouts/page?pageId=p1");
    });

    it("propagates errors via handleApiError", async () => {
      mockDelete.mockRejectedValue(new Error("Delete failed"));

      await expect(deleteSiteLayout("home")).rejects.toThrow("Delete failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("getSiteLayoutPreviewUrl", () => {
    it("calls GET /site-layouts/:scope/preview-url and returns url", async () => {
      mockGet.mockResolvedValue({
        data: { url: "https://preview.example.com/home" },
      });

      const result = await getSiteLayoutPreviewUrl("home");

      expect(mockGet).toHaveBeenCalledWith("/site-layouts/home/preview-url");
      expect(result).toBe("https://preview.example.com/home");
    });

    it("appends pageId when provided", async () => {
      mockGet.mockResolvedValue({
        data: { url: "https://preview.example.com/page?pageId=p1" },
      });

      await getSiteLayoutPreviewUrl("page", "p1");

      expect(mockGet).toHaveBeenCalledWith(
        "/site-layouts/page/preview-url?pageId=p1",
      );
    });

    it("propagates errors via handleApiError", async () => {
      mockGet.mockRejectedValue(new Error("No preview target"));

      await expect(getSiteLayoutPreviewUrl("home")).rejects.toThrow(
        "No preview target",
      );
    });
  });

  // -------------------------------------------------------------------------
  describe("resetSiteLayoutFromTemplate", () => {
    it("calls POST /site-layouts/:scope/reset-from-template", async () => {
      mockPost.mockResolvedValue({ data: { layout: sampleLayout } });

      const result = await resetSiteLayoutFromTemplate("home");

      expect(mockPost).toHaveBeenCalledWith(
        "/site-layouts/home/reset-from-template",
        {},
      );
      expect(result).toEqual(sampleLayout);
    });

    it("appends pageId when provided", async () => {
      mockPost.mockResolvedValue({ data: { layout: sampleLayout } });

      await resetSiteLayoutFromTemplate("page", "p1");

      expect(mockPost).toHaveBeenCalledWith(
        "/site-layouts/page/reset-from-template?pageId=p1",
        {},
      );
    });

    it("propagates errors via handleApiError", async () => {
      mockPost.mockRejectedValue(new Error("No template"));

      await expect(resetSiteLayoutFromTemplate("home")).rejects.toThrow(
        "No template",
      );
    });
  });

  // -------------------------------------------------------------------------
  describe("refreshPreviewToken", () => {
    it("returns the new url on success", async () => {
      mockPost.mockResolvedValue({
        data: { url: "https://preview.example.com/home?token=fresh" },
      });

      const result = await refreshPreviewToken("stale-token");

      expect(mockPost).toHaveBeenCalledWith("/site-layouts/preview/refresh", {
        token: "stale-token",
      });
      expect(result).toBe("https://preview.example.com/home?token=fresh");
    });

    it("returns null on 404 (token expired) so callers can re-mint", async () => {
      mockPost.mockRejectedValue({ response: { status: 404 } });

      const result = await refreshPreviewToken("dead-token");

      expect(result).toBeNull();
    });

    it("propagates non-404 errors", async () => {
      mockPost.mockRejectedValue(new Error("server boom"));

      await expect(refreshPreviewToken("any-token")).rejects.toThrow(
        "server boom",
      );
    });
  });
});
