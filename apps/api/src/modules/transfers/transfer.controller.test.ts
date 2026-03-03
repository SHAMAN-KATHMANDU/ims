import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./transfer.service", () => ({
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    approve: vi.fn(),
    startTransit: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
    getLogs: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import transferController from "./transfer.controller";
import * as transferServiceModule from "./transfer.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = transferServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: "u1", tenantId: "t1", role: "admin", tenantSlug: "acme" },
    params: {},
    body: {},
    query: {},
    get: vi.fn(),
    socket: {},
    ...overrides,
  } as unknown as Request;
}

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("TransferController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTransfer", () => {
    it("returns 201 with created transfer on success", async () => {
      const transfer = {
        id: "tr1",
        transferCode: "TRF-ABC",
        status: "PENDING",
      };
      mockService.create.mockResolvedValue(transfer);
      const req = makeReq({
        body: {
          fromLocationId: validUuid,
          toLocationId: "550e8400-e29b-41d4-a716-446655440001",
          items: [{ variationId: validUuid, quantity: 5 }],
        },
      });
      const res = mockRes() as Response;

      await transferController.createTransfer(req, res);

      expect(mockService.create).toHaveBeenCalledWith(
        "t1",
        "u1",
        expect.objectContaining({
          fromLocationId: validUuid,
          toLocationId: "550e8400-e29b-41d4-a716-446655440001",
          items: [{ variationId: validUuid, quantity: 5 }],
        }),
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Transfer request created successfully",
          transfer,
        }),
      );
    });

    it("returns 400 with insufficientStock when service throws", async () => {
      const err = new Error("Insufficient stock for some items") as Error & {
        statusCode?: number;
        insufficientStock?: unknown[];
      };
      err.statusCode = 400;
      err.insufficientStock = [
        { product: "X", imsCode: "I1", requested: 10, available: 2 },
      ];
      mockService.create.mockRejectedValue(err);
      const req = makeReq({
        body: {
          fromLocationId: validUuid,
          toLocationId: "550e8400-e29b-41d4-a716-446655440001",
          items: [{ variationId: validUuid, quantity: 10 }],
        },
      });
      const res = mockRes() as Response;

      await transferController.createTransfer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Insufficient stock for some items",
          insufficientStock: expect.any(Array),
        }),
      );
    });

    it("returns 400 when Zod validation fails", async () => {
      const req = makeReq({
        body: {
          fromLocationId: validUuid,
          toLocationId: validUuid,
          items: [],
        },
      });
      const res = mockRes() as Response;

      await transferController.createTransfer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        body: {
          fromLocationId: validUuid,
          toLocationId: "550e8400-e29b-41d4-a716-446655440001",
          items: [{ variationId: validUuid, quantity: 1 }],
        },
      });
      const res = mockRes() as Response;

      await transferController.createTransfer(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getAllTransfers", () => {
    it("returns 200 with paginated transfers on success", async () => {
      const result = {
        data: [{ id: "tr1", transferCode: "TRF-1" }],
        pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
      };
      mockService.findAll.mockResolvedValue(result);
      const req = makeReq({ query: { page: "1", limit: "10" } });
      const res = mockRes() as Response;

      await transferController.getAllTransfers(req, res);

      expect(mockService.findAll).toHaveBeenCalledWith(
        "t1",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Transfers fetched successfully",
          ...result,
        }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.findAll.mockRejectedValue(new Error("DB error"));
      const req = makeReq();
      const res = mockRes() as Response;

      await transferController.getAllTransfers(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getTransferById", () => {
    it("returns 200 with transfer on success", async () => {
      const transfer = { id: "tr1", transferCode: "TRF-1" };
      mockService.findById.mockResolvedValue(transfer);
      const req = makeReq({ params: { id: "tr1" } });
      const res = mockRes() as Response;

      await transferController.getTransferById(req, res);

      expect(mockService.findById).toHaveBeenCalledWith("t1", "tr1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Transfer fetched successfully",
          transfer,
        }),
      );
    });

    it("returns 404 when transfer not found", async () => {
      const err = new Error("Transfer not found") as Error & {
        statusCode?: number;
      };
      err.statusCode = 404;
      mockService.findById.mockRejectedValue(err);
      const req = makeReq({ params: { id: "tr1" } });
      const res = mockRes() as Response;

      await transferController.getTransferById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("approveTransfer", () => {
    it("returns 200 with approved transfer on success", async () => {
      const transfer = { id: "tr1", status: "APPROVED" };
      mockService.approve.mockResolvedValue(transfer);
      const req = makeReq({ params: { id: "tr1" } });
      const res = mockRes() as Response;

      await transferController.approveTransfer(req, res);

      expect(mockService.approve).toHaveBeenCalledWith("t1", "u1", "tr1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Transfer approved successfully",
          transfer,
        }),
      );
    });

    it("returns 400 with insufficientStock when service throws", async () => {
      const err = new Error("Insufficient stock") as Error & {
        statusCode?: number;
        insufficientStock?: unknown[];
      };
      err.statusCode = 400;
      err.insufficientStock = [];
      mockService.approve.mockRejectedValue(err);
      const req = makeReq({ params: { id: "tr1" } });
      const res = mockRes() as Response;

      await transferController.approveTransfer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("startTransit", () => {
    it("returns 200 on success", async () => {
      const transfer = { id: "tr1", status: "IN_TRANSIT" };
      mockService.startTransit.mockResolvedValue(transfer);
      const req = makeReq({ params: { id: "tr1" } });
      const res = mockRes() as Response;

      await transferController.startTransit(req, res);

      expect(mockService.startTransit).toHaveBeenCalledWith("t1", "u1", "tr1");
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("completeTransfer", () => {
    it("returns 200 on success", async () => {
      const transfer = { id: "tr1", status: "COMPLETED" };
      mockService.complete.mockResolvedValue(transfer);
      const req = makeReq({ params: { id: "tr1" } });
      const res = mockRes() as Response;

      await transferController.completeTransfer(req, res);

      expect(mockService.complete).toHaveBeenCalledWith("t1", "u1", "tr1");
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("cancelTransfer", () => {
    it("returns 200 with stock restored message when was IN_TRANSIT", async () => {
      mockService.cancel.mockResolvedValue({
        transfer: { id: "tr1", status: "CANCELLED" },
        previousStatus: "IN_TRANSIT",
      });
      const req = makeReq({ params: { id: "tr1" }, body: { reason: "Wrong" } });
      const res = mockRes() as Response;

      await transferController.cancelTransfer(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Transfer cancelled successfully. Stock restored to source location.",
        }),
      );
    });

    it("returns 200 with simple message when was not IN_TRANSIT", async () => {
      mockService.cancel.mockResolvedValue({
        transfer: { id: "tr1", status: "CANCELLED" },
        previousStatus: "PENDING",
      });
      const req = makeReq({ params: { id: "tr1" } });
      const res = mockRes() as Response;

      await transferController.cancelTransfer(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Transfer cancelled successfully.",
        }),
      );
    });
  });

  describe("getTransferLogs", () => {
    it("returns 200 with logs on success", async () => {
      const result = {
        transferCode: "TRF-1",
        logs: [{ id: "l1", action: "CREATED" }],
      };
      mockService.getLogs.mockResolvedValue(result);
      const req = makeReq({ params: { id: "tr1" } });
      const res = mockRes() as Response;

      await transferController.getTransferLogs(req, res);

      expect(mockService.getLogs).toHaveBeenCalledWith("t1", "tr1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Transfer logs fetched successfully",
          transferCode: "TRF-1",
          logs: expect.any(Array),
        }),
      );
    });
  });
});
