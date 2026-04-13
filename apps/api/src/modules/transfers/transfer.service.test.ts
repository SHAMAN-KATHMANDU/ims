import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransferService } from "./transfer.service";
import type { TransferRepository } from "./transfer.repository";
import { createError } from "@/middlewares/errorHandler";

const mockFindLocationById = vi.fn();
const mockFindVariationWithSubVariations = vi.fn();
const mockFindInventory = vi.fn();
const mockCreateTransfer = vi.fn();
const mockCreateTransferLog = vi.fn();
const mockFindTransferById = vi.fn();
const mockFindTransferWithItems = vi.fn();
const mockUpdateTransferApprove = vi.fn();
const mockUpdateTransferStatus = vi.fn();
const mockUpdateTransferCancel = vi.fn();
const mockFindTransferLogs = vi.fn();
const mockCountTransfers = vi.fn();
const mockFindManyTransfers = vi.fn();
const mockDecrementInventory = vi.fn();
const mockIncrementInventory = vi.fn();
const mockCreateInventory = vi.fn();

const mockRepo: TransferRepository = {
  findLocationById: mockFindLocationById,
  findVariationWithSubVariations: mockFindVariationWithSubVariations,
  findInventory: mockFindInventory,
  createTransfer: mockCreateTransfer,
  createTransferLog: mockCreateTransferLog,
  findTransferById: mockFindTransferById,
  findTransferWithItems: mockFindTransferWithItems,
  updateTransferApprove: mockUpdateTransferApprove,
  updateTransferStatus: mockUpdateTransferStatus,
  updateTransferCancel: mockUpdateTransferCancel,
  findTransferLogs: mockFindTransferLogs,
  countTransfers: mockCountTransfers,
  findManyTransfers: mockFindManyTransfers,
  decrementInventory: mockDecrementInventory,
  incrementInventory: mockIncrementInventory,
  createInventory: mockCreateInventory,
} as unknown as TransferRepository;

vi.mock("@/modules/audit/audit.repository", () => ({
  default: {
    create: vi.fn().mockResolvedValue(undefined),
  },
}));

const transferService = new TransferService(mockRepo);

describe("TransferService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates transfer when locations and stock are valid", async () => {
      const fromLoc = { id: "loc1", name: "Source", isActive: true };
      const toLoc = { id: "loc2", name: "Dest", isActive: true };
      const variation = {
        subVariations: [],
        product: { name: "P1", imsCode: "IMS1" },
      };

      mockFindLocationById
        .mockResolvedValueOnce(fromLoc)
        .mockResolvedValueOnce(toLoc);
      mockFindVariationWithSubVariations.mockResolvedValue(variation);
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockCreateTransfer.mockResolvedValue({
        id: "trf1",
        transferCode: "TRF-1",
        fromLocationId: "loc1",
        toLocationId: "loc2",
        status: "PENDING",
        items: [{ variationId: "v1", quantity: 5 }],
      });

      const result = await transferService.create("t1", "u1", {
        fromLocationId: "loc1",
        toLocationId: "loc2",
        items: [{ variationId: "v1", quantity: 5 }],
      });

      expect(result.transferCode).toBe("TRF-1");
      expect(mockCreateTransfer).toHaveBeenCalled();
    });

    it("throws 404 when source location not found", async () => {
      mockFindLocationById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "loc2", isActive: true });

      await expect(
        transferService.create("t1", "u1", {
          fromLocationId: "missing",
          toLocationId: "loc2",
          items: [{ variationId: "v1", quantity: 1 }],
        }),
      ).rejects.toMatchObject(createError("Source location not found", 404));

      expect(mockCreateTransfer).not.toHaveBeenCalled();
    });

    it("throws 404 when destination location not found", async () => {
      mockFindLocationById
        .mockResolvedValueOnce({ id: "loc1", isActive: true })
        .mockResolvedValueOnce(null);

      await expect(
        transferService.create("t1", "u1", {
          fromLocationId: "loc1",
          toLocationId: "missing",
          items: [{ variationId: "v1", quantity: 1 }],
        }),
      ).rejects.toMatchObject(
        createError("Destination location not found", 404),
      );

      expect(mockCreateTransfer).not.toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("returns transfer when found and tenant matches", async () => {
      const transfer = { id: "trf1", tenantId: "t1", status: "PENDING" };
      mockFindTransferById.mockResolvedValue(transfer);

      const result = await transferService.findById("t1", "trf1");
      expect(result).toEqual(transfer);
    });

    it("throws 404 when transfer not found", async () => {
      mockFindTransferById.mockResolvedValue(null);

      await expect(
        transferService.findById("t1", "missing"),
      ).rejects.toMatchObject(createError("Transfer not found", 404));
    });

    it("throws 404 when tenant does not match", async () => {
      mockFindTransferById.mockResolvedValue({
        id: "trf1",
        tenantId: "other-tenant",
      });

      await expect(
        transferService.findById("t1", "trf1"),
      ).rejects.toMatchObject(createError("Transfer not found", 404));
    });
  });

  describe("approve", () => {
    it("approves transfer when stock is sufficient", async () => {
      const transfer = {
        id: "trf1",
        tenantId: "t1",
        status: "PENDING",
        fromLocationId: "loc1",
        items: [
          {
            variationId: "v1",
            subVariationId: null,
            quantity: 5,
            variation: { product: { name: "P1", imsCode: "IMS1" } },
          },
        ],
      };
      mockFindTransferWithItems.mockResolvedValue(transfer);
      mockFindInventory.mockResolvedValue({ quantity: 10 });
      mockUpdateTransferApprove.mockResolvedValue({
        ...transfer,
        status: "APPROVED",
      });

      const result = await transferService.approve("t1", "u1", "trf1");
      expect(result.status).toBe("APPROVED");
      expect(mockUpdateTransferApprove).toHaveBeenCalled();
    });

    it("throws 400 when transfer status is not PENDING", async () => {
      mockFindTransferWithItems.mockResolvedValue({
        id: "trf1",
        tenantId: "t1",
        status: "APPROVED",
      });

      await expect(
        transferService.approve("t1", "u1", "trf1"),
      ).rejects.toMatchObject(
        expect.objectContaining({
          statusCode: 400,
          message: expect.stringContaining("Cannot approve"),
        }),
      );

      expect(mockUpdateTransferApprove).not.toHaveBeenCalled();
    });
  });

  describe("cancel", () => {
    it("throws 400 when transfer is already completed", async () => {
      mockFindTransferById.mockResolvedValue({
        id: "trf1",
        tenantId: "t1",
        status: "COMPLETED",
      });

      await expect(
        transferService.cancel("t1", "u1", "trf1"),
      ).rejects.toMatchObject(
        createError("Cannot cancel a completed transfer", 400),
      );
    });
  });
});
