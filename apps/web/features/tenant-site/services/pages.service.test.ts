import { describe, it, expect, vi, beforeEach } from "vitest";
import { pagesService } from "./pages.service";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((error) => {
    throw new Error(error?.response?.data?.message || "API error");
  }),
}));

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

describe("pagesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listPages", () => {
    it("returns pages list with pagination on success", async () => {
      const mockResponse = {
        data: {
          message: "OK",
          pages: [
            {
              id: "p1",
              slug: "about",
              title: "About Us",
              isPublished: true,
            },
          ],
          total: 1,
          page: 1,
          limit: 50,
        },
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await pagesService.listPages({ page: 1, limit: 50 });

      expect(result.pages).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(vi.mocked(api.get)).toHaveBeenCalledWith("/pages?page=1&limit=50");
    });

    it("handles API error on listPages", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Network error"));
      vi.mocked(handleApiError).mockImplementation(() => {
        throw new Error("Network error");
      });

      await expect(pagesService.listPages()).rejects.toThrow();
    });
  });

  describe("getPage", () => {
    it("returns a single page by id", async () => {
      const mockPage = { id: "p1", slug: "about", title: "About Us" };
      vi.mocked(api.get).mockResolvedValue({
        data: { message: "OK", page: mockPage },
      });

      const result = await pagesService.getPage("p1");

      expect(result).toEqual(mockPage);
      expect(vi.mocked(api.get)).toHaveBeenCalledWith("/pages/p1");
    });

    it("handles not found error", async () => {
      const error = new Error("Not found");
      (error as unknown as { response: { status: number } }).response = {
        status: 404,
      };
      vi.mocked(api.get).mockRejectedValue(error);
      vi.mocked(handleApiError).mockImplementation(() => {
        throw new Error("Not found");
      });

      await expect(pagesService.getPage("nonexistent")).rejects.toThrow(
        "Not found",
      );
    });
  });

  describe("createPage", () => {
    it("creates a page and returns it", async () => {
      const payload = { slug: "new", title: "New Page" };
      const mockPage = { id: "p2", ...payload };
      vi.mocked(api.post).mockResolvedValue({
        data: { message: "Page created", page: mockPage },
      });

      const result = await pagesService.createPage(payload);

      expect(result).toEqual(mockPage);
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/pages", payload);
    });

    it("handles API error on createPage", async () => {
      vi.mocked(api.post).mockRejectedValue(new Error("Conflict"));
      vi.mocked(handleApiError).mockImplementation(() => {
        throw new Error("Conflict");
      });

      await expect(
        pagesService.createPage({ slug: "duplicate", title: "Page" }),
      ).rejects.toThrow("Conflict");
    });
  });

  describe("publishPage", () => {
    it("publishes a page", async () => {
      const mockPage = { id: "p1", slug: "about", isPublished: true };
      vi.mocked(api.post).mockResolvedValue({
        data: { message: "Page published", page: mockPage },
      });

      const result = await pagesService.publishPage("p1");

      expect(result.isPublished).toBe(true);
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/pages/p1/publish", {});
    });
  });

  describe("deleteSnippet", () => {
    it("deletes a page", async () => {
      vi.mocked(api.delete).mockResolvedValue({});

      await pagesService.deletePage("p1");

      expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/pages/p1");
    });
  });
});
