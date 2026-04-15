import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/modules/sales/sale.service", () => ({
  createSale: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({
  default: {
    product: {
      findFirst: vi.fn(),
    },
  },
}));

import { WebsiteOrdersService } from "./website-orders.service";
import * as saleService from "@/modules/sales/sale.service";
import prismaMock from "@/config/prisma";
import type defaultRepo from "./website-orders.repository";
import type sitesRepo from "@/modules/sites/sites.repository";

type Repo = typeof defaultRepo;
type SitesRepo = typeof sitesRepo;

const mockRepo = {
  listOrders: vi.fn(),
  getOrderById: vi.fn(),
  countThisYear: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
} as unknown as Repo;

const mockSites = { findConfig: vi.fn() } as unknown as SitesRepo;

const service = new WebsiteOrdersService(mockRepo, mockSites);

function enabledSite() {
  return {
    id: "sc1",
    tenantId: "t1",
    websiteEnabled: true,
    isPublished: true,
    templateId: "tpl1",
    branding: null,
    contact: null,
    features: null,
    seo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    template: null,
  };
}

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "o1",
    tenantId: "t1",
    orderCode: "WO-2026-0001",
    status: "PENDING_VERIFICATION" as const,
    customerName: "Ada",
    customerPhone: "+977-98xxx",
    customerEmail: null,
    customerNote: null,
    items: [
      {
        productId: "prod-1",
        productName: "Lamp",
        unitPrice: 1000,
        quantity: 1,
        lineTotal: 1000,
      },
    ],
    subtotal: 1000 as unknown as number,
    currency: "NPR",
    sourceIp: null,
    sourceUserAgent: null,
    verifiedAt: null,
    verifiedById: null,
    rejectedAt: null,
    rejectedById: null,
    rejectionReason: null,
    convertedAt: null,
    convertedById: null,
    convertedSaleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("WebsiteOrdersService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("feature gate", () => {
    it("403s when website feature is off", async () => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.listOrders("t1", { page: 1, limit: 20 }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe("verifyOrder", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        enabledSite(),
      );
    });

    it("404s when order missing", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      await expect(
        service.verifyOrder("t1", "missing", "u1"),
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("rejects verify on an already rejected order", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "REJECTED" }),
      );
      await expect(service.verifyOrder("t1", "o1", "u1")).rejects.toMatchObject(
        { statusCode: 400 },
      );
    });

    it("rejects verify on a converted order", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "CONVERTED_TO_SALE" }),
      );
      await expect(service.verifyOrder("t1", "o1", "u1")).rejects.toMatchObject(
        { statusCode: 400 },
      );
    });

    it("sets status + verifier + verifiedAt on success", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        order(),
      );
      (mockRepo.updateOrder as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "VERIFIED" }),
      );
      await service.verifyOrder("t1", "o1", "u1");
      const [, , data] = (mockRepo.updateOrder as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.status).toBe("VERIFIED");
      expect(data.verifiedAt).toBeInstanceOf(Date);
      expect(data.verifier).toEqual({ connect: { id: "u1" } });
    });
  });

  describe("rejectOrder", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        enabledSite(),
      );
    });

    it("rejects a pending order with a reason", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        order(),
      );
      (mockRepo.updateOrder as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "REJECTED" }),
      );
      await service.rejectOrder("t1", "o1", "u1", { reason: "spam call" });
      const [, , data] = (mockRepo.updateOrder as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.status).toBe("REJECTED");
      expect(data.rejectionReason).toBe("spam call");
    });

    it("refuses to reject a converted order", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "CONVERTED_TO_SALE" }),
      );
      await expect(
        service.rejectOrder("t1", "o1", "u1", { reason: "x" }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe("deleteOrder", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        enabledSite(),
      );
    });

    it("refuses to delete a converted order", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "CONVERTED_TO_SALE" }),
      );
      await expect(service.deleteOrder("t1", "o1")).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("deletes a pending order", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        order(),
      );
      (mockRepo.deleteOrder as ReturnType<typeof vi.fn>).mockResolvedValue(
        order(),
      );
      await service.deleteOrder("t1", "o1");
      expect(mockRepo.deleteOrder).toHaveBeenCalledWith("t1", "o1");
    });
  });

  describe("convertToSale", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        enabledSite(),
      );
    });

    it("rejects conversion of a non-verified order", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "PENDING_VERIFICATION" }),
      );
      await expect(
        service.convertToSale("t1", "o1", "u1", {
          locationId: "loc-1",
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("errors cleanly when a snapshot product no longer exists", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "VERIFIED" }),
      );
      (
        (
          prismaMock as unknown as {
            product: { findFirst: ReturnType<typeof vi.fn> };
          }
        ).product.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);
      await expect(
        service.convertToSale("t1", "o1", "u1", {
          locationId: "loc-1",
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("errors cleanly when a product has no active variation", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "VERIFIED" }),
      );
      (
        (
          prismaMock as unknown as {
            product: { findFirst: ReturnType<typeof vi.fn> };
          }
        ).product.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "prod-1",
        variations: [],
      });
      await expect(
        service.convertToSale("t1", "o1", "u1", {
          locationId: "loc-1",
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("calls createSale with resolved variationIds on success", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "VERIFIED" }),
      );
      (
        (
          prismaMock as unknown as {
            product: { findFirst: ReturnType<typeof vi.fn> };
          }
        ).product.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "prod-1",
        variations: [{ id: "var-1" }],
      });
      (saleService.createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "sale-1",
        saleCode: "S-001",
      });
      (mockRepo.updateOrder as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "CONVERTED_TO_SALE" }),
      );

      await service.convertToSale("t1", "o1", "u1", {
        locationId: "loc-1",
      });

      expect(saleService.createSale).toHaveBeenCalledWith(
        { tenantId: "t1", userId: "u1" },
        expect.objectContaining({
          locationId: "loc-1",
          memberPhone: "+977-98xxx",
          memberName: "Ada",
          items: [{ variationId: "var-1", quantity: 1 }],
        }),
      );
      const [, , data] = (mockRepo.updateOrder as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.status).toBe("CONVERTED_TO_SALE");
      expect(data.sale).toEqual({ connect: { id: "sale-1" } });
    });

    it("uses itemOverrides when provided", async () => {
      (mockRepo.getOrderById as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "VERIFIED" }),
      );
      (saleService.createSale as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "sale-1",
      });
      (mockRepo.updateOrder as ReturnType<typeof vi.fn>).mockResolvedValue(
        order({ status: "CONVERTED_TO_SALE" }),
      );

      await service.convertToSale("t1", "o1", "u1", {
        locationId: "loc-1",
        itemOverrides: [
          {
            productId: "11111111-1111-1111-1111-111111111111",
            variationId: "22222222-2222-2222-2222-222222222222",
            quantity: 3,
          },
        ],
      });

      expect(saleService.createSale).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          items: [
            {
              variationId: "22222222-2222-2222-2222-222222222222",
              quantity: 3,
            },
          ],
        }),
      );
      // product.findFirst must NOT have been called when overrides are used
      expect(
        (
          prismaMock as unknown as {
            product: { findFirst: ReturnType<typeof vi.fn> };
          }
        ).product.findFirst,
      ).not.toHaveBeenCalled();
    });
  });

  describe("createGuestOrder", () => {
    beforeEach(() => {
      (mockSites.findConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
        enabledSite(),
      );
    });

    it("rejects an empty cart", async () => {
      await expect(
        service.createGuestOrder("t1", {
          customerName: "Ada",
          customerPhone: "+977",
          items: [],
        }),
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("creates an order with a server-computed subtotal", async () => {
      (mockRepo.countThisYear as ReturnType<typeof vi.fn>).mockResolvedValue(5);
      (mockRepo.createOrder as ReturnType<typeof vi.fn>).mockResolvedValue(
        order(),
      );

      await service.createGuestOrder("t1", {
        customerName: "Ada",
        customerPhone: "+977",
        items: [
          {
            productId: "prod-1",
            productName: "Lamp",
            unitPrice: 1000,
            quantity: 2,
            lineTotal: 2000,
          },
          {
            productId: "prod-2",
            productName: "Bowl",
            unitPrice: 500,
            quantity: 1,
            lineTotal: 500,
          },
        ],
      });

      const [, data] = (mockRepo.createOrder as ReturnType<typeof vi.fn>).mock
        .calls[0];
      expect(data.orderCode).toBe(`WO-${new Date().getFullYear()}-0006`);
      expect(data.subtotal.toString()).toBe("2500");
    });
  });
});
