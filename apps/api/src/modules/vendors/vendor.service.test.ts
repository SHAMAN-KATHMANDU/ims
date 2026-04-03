import { describe, it, expect, vi, beforeEach } from "vitest";
import { VendorService } from "./vendor.service";
import type { VendorRepository } from "./vendor.repository";
import { createError } from "@/middlewares/errorHandler";

const mockPublishDomainEvent = vi.fn().mockResolvedValue(undefined);
const mockFindByName = vi.fn();
const mockFindByNameExcluding = vi.fn();
const mockCreate = vi.fn();
const mockFindAll = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdWithProductCount = vi.fn();
const mockFindVendorProducts = vi.fn();
const mockUpdate = vi.fn();
const mockSoftDelete = vi.fn();

const mockRepo: VendorRepository = {
  findByName: mockFindByName,
  findByNameExcluding: mockFindByNameExcluding,
  create: mockCreate,
  findAll: mockFindAll,
  findById: mockFindById,
  findByIdWithProductCount: mockFindByIdWithProductCount,
  findVendorProducts: mockFindVendorProducts,
  update: mockUpdate,
  softDelete: mockSoftDelete,
} as unknown as VendorRepository;

vi.mock("@/shared/audit/createDeleteAuditLog", () => ({
  createDeleteAuditLog: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/config/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));
vi.mock("@/modules/automation/automation.service", () => ({
  default: {
    publishDomainEvent: (...args: unknown[]) => mockPublishDomainEvent(...args),
  },
}));

const vendorService = new VendorService(mockRepo);

describe("VendorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates vendor when name is available", async () => {
      mockFindByName.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: "v1",
        name: "Acme Supplies",
        tenantId: "t1",
      });

      const result = await vendorService.create("t1", {
        name: "Acme Supplies",
      });

      expect(result.name).toBe("Acme Supplies");
      expect(mockFindByName).toHaveBeenCalledWith("t1", "Acme Supplies");
      expect(mockCreate).toHaveBeenCalled();
      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          eventName: "vendors.vendor.created",
          entityId: "v1",
        }),
      );
    });

    it("throws 409 when vendor name already exists", async () => {
      mockFindByName.mockResolvedValue({
        id: "v0",
        name: "Acme Supplies",
      });

      await expect(
        vendorService.create("t1", { name: "Acme Supplies" }),
      ).rejects.toMatchObject(
        createError("Vendor with this name already exists", 409),
      );

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns vendor when found", async () => {
      const vendor = { id: "v1", name: "Acme", tenantId: "t1" };
      mockFindById.mockResolvedValue(vendor);

      const result = await vendorService.findById("v1", "t1");
      expect(result).toEqual(vendor);
    });

    it("throws 404 when vendor not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        vendorService.findById("missing", "t1"),
      ).rejects.toMatchObject(createError("Vendor not found", 404));
    });
  });

  describe("delete", () => {
    it("throws 400 when vendor has associated products", async () => {
      mockFindByIdWithProductCount.mockResolvedValue({
        id: "v1",
        name: "Acme",
        _count: { products: 5 },
      });

      await expect(
        vendorService.delete("v1", "t1", { userId: "u1" }),
      ).rejects.toMatchObject(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining("product"),
        }),
      );

      expect(mockSoftDelete).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("publishes an automation event after update", async () => {
      mockFindByIdWithProductCount.mockResolvedValue({
        id: "v1",
        name: "Acme",
        _count: { products: 0 },
      });
      mockUpdate.mockResolvedValue({
        id: "v1",
        name: "Acme Updated",
        contact: null,
        address: null,
        phone: null,
        updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      });

      const result = await vendorService.update("v1", "t1", {
        name: "Acme Updated",
      });

      expect(result.name).toBe("Acme Updated");
      expect(mockPublishDomainEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "t1",
          eventName: "vendors.vendor.updated",
          entityId: "v1",
        }),
      );
    });
  });
});
