import { describe, it, expect, vi, beforeEach } from "vitest";
import { snippetsService } from "./snippets.service";

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

describe("snippetsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listSnippets", () => {
    it("returns snippets list with pagination on success", async () => {
      const mockResponse = {
        data: {
          message: "OK",
          snippets: [
            {
              id: "s1",
              slug: "hero-section",
              title: "Hero Section",
            },
          ],
          total: 1,
          page: 1,
          limit: 50,
        },
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await snippetsService.listSnippets({ page: 1, limit: 50 });

      expect(result.snippets).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        "/snippets?page=1&limit=50",
      );
    });

    it("filters snippets by category", async () => {
      const mockResponse = {
        data: {
          message: "OK",
          snippets: [],
          total: 0,
          page: 1,
          limit: 50,
        },
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      await snippetsService.listSnippets({ category: "headers" });

      expect(vi.mocked(api.get)).toHaveBeenCalledWith(
        expect.stringContaining("category=headers"),
      );
    });

    it("handles API error on listSnippets", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Network error"));
      vi.mocked(handleApiError).mockImplementation(() => {
        throw new Error("Network error");
      });

      await expect(snippetsService.listSnippets()).rejects.toThrow();
    });
  });

  describe("getSnippet", () => {
    it("returns a single snippet by id", async () => {
      const mockSnippet = {
        id: "s1",
        slug: "hero-section",
        title: "Hero Section",
      };
      vi.mocked(api.get).mockResolvedValue({
        data: { message: "OK", snippet: mockSnippet },
      });

      const result = await snippetsService.getSnippet("s1");

      expect(result).toEqual(mockSnippet);
      expect(vi.mocked(api.get)).toHaveBeenCalledWith("/snippets/s1");
    });
  });

  describe("createSnippet", () => {
    it("creates a snippet and returns it", async () => {
      const payload = { slug: "new-snippet", title: "New Snippet" };
      const mockSnippet = { id: "s2", ...payload };
      vi.mocked(api.post).mockResolvedValue({
        data: { message: "Snippet created", snippet: mockSnippet },
      });

      const result = await snippetsService.createSnippet(payload);

      expect(result).toEqual(mockSnippet);
      expect(vi.mocked(api.post)).toHaveBeenCalledWith("/snippets", payload);
    });
  });

  describe("updateSnippet", () => {
    it("updates a snippet and returns it", async () => {
      const payload = { title: "Updated Title" };
      const mockSnippet = { id: "s1", slug: "hero-section", ...payload };
      vi.mocked(api.patch).mockResolvedValue({
        data: { message: "Snippet updated", snippet: mockSnippet },
      });

      const result = await snippetsService.updateSnippet("s1", payload);

      expect(result).toEqual(mockSnippet);
      expect(vi.mocked(api.patch)).toHaveBeenCalledWith(
        "/snippets/s1",
        payload,
      );
    });
  });

  describe("deleteSnippet", () => {
    it("deletes a snippet", async () => {
      vi.mocked(api.delete).mockResolvedValue({});

      await snippetsService.deleteSnippet("s1");

      expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/snippets/s1");
    });
  });
});
