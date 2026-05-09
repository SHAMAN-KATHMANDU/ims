import { describe, it, expect, vi, beforeEach } from "vitest";
import { promosService, type PromoCode } from "./promos.service";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((_error) => {
    throw new Error("API Error");
  }),
}));

import api from "@/lib/axios";

describe("promosService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listPromos", () => {
    it("returns paginated list of promos", async () => {
      const mockPromos: PromoCode[] = [
        {
          id: "promo-1",
          tenantId: "tenant-1",
          code: "SAVE10",
          valueType: "PERCENTAGE",
          value: 10,
          overrideDiscounts: false,
          allowStacking: false,
          eligibility: "ALL",
          usageCount: 5,
          isActive: true,
          createdAt: "2026-05-09T00:00:00Z",
          updatedAt: "2026-05-09T00:00:00Z",
        },
      ];

      vi.mocked(api.get).mockResolvedValueOnce({
        data: {
          promos: mockPromos,
          pagination: {
            page: 1,
            limit: 10,
            totalItems: 1,
            totalPages: 1,
          },
        },
      });

      const result = await promosService.listPromos({ page: 1, limit: 10 });

      expect(result.promos).toEqual(mockPromos);
      expect(result.pagination).toBeDefined();
      expect(api.get).toHaveBeenCalledWith("/promos", expect.any(Object));
    });
  });

  describe("getPromo", () => {
    it("returns a single promo by id", async () => {
      const mockPromo: PromoCode = {
        id: "promo-1",
        tenantId: "tenant-1",
        code: "SAVE10",
        valueType: "PERCENTAGE",
        value: 10,
        overrideDiscounts: false,
        allowStacking: false,
        eligibility: "ALL",
        usageCount: 5,
        isActive: true,
        createdAt: "2026-05-09T00:00:00Z",
        updatedAt: "2026-05-09T00:00:00Z",
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { promo: mockPromo },
      });

      const result = await promosService.getPromo("promo-1");

      expect(result).toEqual(mockPromo);
      expect(api.get).toHaveBeenCalledWith("/promos/promo-1");
    });
  });

  describe("getPromoByCode", () => {
    it("returns a promo by code (case-insensitive)", async () => {
      const mockPromo: PromoCode = {
        id: "promo-1",
        tenantId: "tenant-1",
        code: "SAVE10",
        valueType: "PERCENTAGE",
        value: 10,
        overrideDiscounts: false,
        allowStacking: false,
        eligibility: "ALL",
        usageCount: 5,
        isActive: true,
        createdAt: "2026-05-09T00:00:00Z",
        updatedAt: "2026-05-09T00:00:00Z",
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { promo: mockPromo },
      });

      const result = await promosService.getPromoByCode("SAVE10");

      expect(result).toEqual(mockPromo);
      expect(api.get).toHaveBeenCalledWith("/promos/by-code/SAVE10");
    });
  });

  describe("createPromo", () => {
    it("creates a new promo code", async () => {
      const mockPromo: PromoCode = {
        id: "promo-1",
        tenantId: "tenant-1",
        code: "SAVE10",
        valueType: "PERCENTAGE",
        value: 10,
        overrideDiscounts: false,
        allowStacking: false,
        eligibility: "ALL",
        usageCount: 0,
        isActive: true,
        createdAt: "2026-05-09T00:00:00Z",
        updatedAt: "2026-05-09T00:00:00Z",
      };

      vi.mocked(api.post).mockResolvedValueOnce({
        data: { promo: mockPromo },
      });

      const result = await promosService.createPromo({
        code: "SAVE10",
        valueType: "PERCENTAGE",
        value: 10,
      });

      expect(result).toEqual(mockPromo);
      expect(api.post).toHaveBeenCalledWith("/promos", expect.any(Object));
    });
  });

  describe("updatePromo", () => {
    it("updates a promo code", async () => {
      const mockPromo: PromoCode = {
        id: "promo-1",
        tenantId: "tenant-1",
        code: "SAVE10",
        valueType: "PERCENTAGE",
        value: 15,
        overrideDiscounts: false,
        allowStacking: false,
        eligibility: "ALL",
        usageCount: 5,
        isActive: true,
        createdAt: "2026-05-09T00:00:00Z",
        updatedAt: "2026-05-09T00:00:00Z",
      };

      vi.mocked(api.put).mockResolvedValueOnce({
        data: { promo: mockPromo },
      });

      const result = await promosService.updatePromo("promo-1", {
        value: 15,
      });

      expect(result.value).toBe(15);
      expect(api.put).toHaveBeenCalledWith(
        "/promos/promo-1",
        expect.any(Object),
      );
    });
  });

  describe("deletePromo", () => {
    it("deletes a promo code", async () => {
      vi.mocked(api.delete).mockResolvedValueOnce({});

      await promosService.deletePromo("promo-1");

      expect(api.delete).toHaveBeenCalledWith("/promos/promo-1");
    });
  });

  describe("getPromoAnalytics", () => {
    it("returns promo analytics", async () => {
      const mockAnalytics = {
        totalRedeemed: 100,
        totalDiscount: 500,
        averageDiscountPerUse: 5,
        activePromos: 3,
      };

      vi.mocked(api.get).mockResolvedValueOnce({
        data: { analytics: mockAnalytics },
      });

      const result = await promosService.getPromoAnalytics();

      expect(result).toEqual(mockAnalytics);
      expect(api.get).toHaveBeenCalledWith("/promos/analytics");
    });
  });
});
