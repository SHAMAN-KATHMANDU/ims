import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listNavMenus,
  upsertNavMenu,
  deleteNavMenu,
} from "./nav-menus.service";

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((err: unknown) => {
    throw err;
  }),
}));

const sampleMenu = {
  id: "nm1",
  tenantId: "t1",
  slot: "header-primary",
  items: { items: [] },
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

describe("nav-menus.service", () => {
  // -------------------------------------------------------------------------
  describe("listNavMenus", () => {
    it("calls GET /nav-menus and returns menus array", async () => {
      mockGet.mockResolvedValue({ data: { menus: [sampleMenu] } });

      const result = await listNavMenus();

      expect(mockGet).toHaveBeenCalledWith("/nav-menus");
      expect(result).toEqual([sampleMenu]);
    });

    it("returns [] when response has no menus key", async () => {
      mockGet.mockResolvedValue({ data: {} });

      const result = await listNavMenus();

      expect(result).toEqual([]);
    });

    it("propagates errors via handleApiError", async () => {
      mockGet.mockRejectedValue(new Error("Network error"));

      await expect(listNavMenus()).rejects.toThrow("Network error");
    });
  });

  // -------------------------------------------------------------------------
  describe("upsertNavMenu", () => {
    it("calls PUT /nav-menus with slot and items payload", async () => {
      mockPut.mockResolvedValue({ data: { menu: sampleMenu } });

      const items = { items: [{ label: "Home", href: "/" }] };
      const result = await upsertNavMenu("header-primary", items);

      expect(mockPut).toHaveBeenCalledWith("/nav-menus", {
        slot: "header-primary",
        items,
      });
      expect(result).toEqual(sampleMenu);
    });

    it("works for footer slots with simple items array", async () => {
      const footerMenu = { ...sampleMenu, slot: "footer-1" };
      mockPut.mockResolvedValue({ data: { menu: footerMenu } });

      await upsertNavMenu("footer-1", { items: [] });

      expect(mockPut).toHaveBeenCalledWith("/nav-menus", {
        slot: "footer-1",
        items: { items: [] },
      });
    });

    it("propagates errors via handleApiError", async () => {
      mockPut.mockRejectedValue(new Error("Save failed"));

      await expect(
        upsertNavMenu("header-primary", { items: [] }),
      ).rejects.toThrow("Save failed");
    });
  });

  // -------------------------------------------------------------------------
  describe("deleteNavMenu", () => {
    it("calls DELETE /nav-menus/:slot", async () => {
      mockDelete.mockResolvedValue({});

      await deleteNavMenu("footer-1");

      expect(mockDelete).toHaveBeenCalledWith("/nav-menus/footer-1");
    });

    it("resolves without returning a value on success", async () => {
      mockDelete.mockResolvedValue({});

      const result = await deleteNavMenu("footer-2");

      expect(result).toBeUndefined();
    });

    it("propagates errors via handleApiError", async () => {
      mockDelete.mockRejectedValue(new Error("Delete failed"));

      await expect(deleteNavMenu("footer-1")).rejects.toThrow("Delete failed");
    });
  });
});
