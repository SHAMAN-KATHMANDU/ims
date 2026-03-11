import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocationService } from "./location.service";
import type { LocationRepository } from "./location.repository";
import { createError } from "@/middlewares/errorHandler";

const mockFindByName = vi.fn();
const mockFindByNameExcluding = vi.fn();
const mockCreate = vi.fn();
const mockFindAll = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdWithTransferCounts = vi.fn();
const mockUpdate = vi.fn();
const mockSoftDelete = vi.fn();
const mockUnsetDefaultWarehouse = vi.fn();
const mockCountActiveWarehouses = vi.fn();
const mockGetInventory = vi.fn();

const mockRepo: LocationRepository = {
  findByName: mockFindByName,
  findByNameExcluding: mockFindByNameExcluding,
  create: mockCreate,
  findAll: mockFindAll,
  findById: mockFindById,
  findByIdWithTransferCounts: mockFindByIdWithTransferCounts,
  update: mockUpdate,
  softDelete: mockSoftDelete,
  unsetDefaultWarehouse: mockUnsetDefaultWarehouse,
  countActiveWarehouses: mockCountActiveWarehouses,
  getInventory: mockGetInventory,
} as unknown as LocationRepository;

vi.mock("@/shared/audit/createDeleteAuditLog", () => ({
  createDeleteAuditLog: vi.fn().mockResolvedValue(undefined),
}));

const locationService = new LocationService(mockRepo);

describe("LocationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates location when name is available", async () => {
      mockFindByName.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: "loc1",
        name: "Warehouse A",
        tenantId: "t1",
        type: "WAREHOUSE",
      });

      const result = await locationService.create("t1", {
        name: "Warehouse A",
        type: "WAREHOUSE",
      });

      expect(result.name).toBe("Warehouse A");
      expect(mockCreate).toHaveBeenCalled();
    });

    it("throws 409 when location name already exists", async () => {
      mockFindByName.mockResolvedValue({
        id: "loc0",
        name: "Warehouse A",
      });

      await expect(
        locationService.create("t1", {
          name: "Warehouse A",
          type: "WAREHOUSE",
        }),
      ).rejects.toMatchObject(
        createError("Location with this name already exists", 409),
      );

      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns location when found", async () => {
      const location = {
        id: "loc1",
        name: "Warehouse A",
        tenantId: "t1",
        type: "WAREHOUSE",
      };
      mockFindById.mockResolvedValue(location);

      const result = await locationService.findById("loc1", "t1");
      expect(result).toEqual(location);
    });

    it("throws 404 when location not found", async () => {
      mockFindById.mockResolvedValue(null);

      await expect(
        locationService.findById("missing", "t1"),
      ).rejects.toMatchObject(createError("Location not found", 404));
    });
  });

  describe("update", () => {
    it("throws 400 for invalid location type", async () => {
      mockFindById.mockResolvedValue({
        id: "loc1",
        name: "Warehouse A",
        type: "WAREHOUSE",
        tenantId: "t1",
      });

      await expect(
        locationService.update("loc1", { type: "INVALID" }, "t1"),
      ).rejects.toMatchObject(
        createError(
          "Invalid location type. Must be WAREHOUSE or SHOWROOM",
          400,
        ),
      );

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("throws 400 when location has pending transfers", async () => {
      mockFindByIdWithTransferCounts.mockResolvedValue({
        id: "loc1",
        type: "WAREHOUSE",
        isActive: true,
        _count: { transfersFrom: 2, transfersTo: 0 },
      });
      mockCountActiveWarehouses.mockResolvedValue(2);

      await expect(
        locationService.delete("loc1", "t1", { userId: "u1" }),
      ).rejects.toMatchObject(
        createError(
          "Cannot delete location with pending transfers. Complete or cancel all transfers first.",
          400,
        ),
      );

      expect(mockSoftDelete).not.toHaveBeenCalled();
    });
  });
});
