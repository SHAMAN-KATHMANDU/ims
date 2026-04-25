import { describe, it, expect, vi, beforeEach } from "vitest";
import { Response } from "express";

vi.mock("./vendor.service", () => ({
  VendorService: vi.fn(),
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    findVendorProducts: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({ default: {} }));

import vendorController from "./vendor.controller";
import * as vendorServiceModule from "./vendor.service";
import { sendControllerError } from "@/utils/controllerError";
import { mockRes, makeReq } from "@tests/helpers/controller";

const mockService = vendorServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function makeAppError(
  message: string,
  statusCode: number,
  extra?: Record<string, unknown>,
) {
  const err = new Error(message) as unknown as Record<string, unknown>;
  err.statusCode = statusCode;
  if (extra) Object.assign(err, extra);
  return err;
}

describe("VendorController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createVendor ──────────────────────────────────────────────────────────

  describe("createVendor", () => {
    it("returns 201 with created vendor on success", async () => {
      const vendor = { id: "v1", name: "Acme Supplies" };
      mockService.create.mockResolvedValue(vendor);
      const req = makeReq({ body: { name: "Acme Supplies" } });
      const res = mockRes() as Response;

      await vendorController.createVendor(req, res);

      expect(mockService.create).toHaveBeenCalledWith("t1", {
        name: "Acme Supplies",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ vendor }),
      );
    });

    it("returns 400 when name is missing (Zod validation)", async () => {
      const req = makeReq({ body: {} });
      const res = mockRes() as Response;

      await vendorController.createVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it("returns 409 when vendor name already exists", async () => {
      mockService.create.mockRejectedValue(
        makeAppError("Vendor with this name already exists", 409, {
          existingVendor: { id: "v1", name: "Acme Supplies" },
        }),
      );
      const req = makeReq({ body: { name: "Acme Supplies" } });
      const res = mockRes() as Response;

      await vendorController.createVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ body: { name: "Acme Supplies" } });
      const res = mockRes() as Response;

      await vendorController.createVendor(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ─── getAllVendors ─────────────────────────────────────────────────────────

  describe("getAllVendors", () => {
    it("returns 200 with paginated vendors", async () => {
      const result = { data: [], pagination: {} };
      mockService.findAll.mockResolvedValue(result);
      const req = makeReq({ query: { page: "1", limit: "10" } });
      const res = mockRes() as Response;

      await vendorController.getAllVendors(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: [], pagination: {} }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.findAll.mockRejectedValue(new Error("DB error"));
      const req = makeReq();
      const res = mockRes() as Response;

      await vendorController.getAllVendors(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ─── getVendorById ─────────────────────────────────────────────────────────

  describe("getVendorById", () => {
    it("returns 200 with vendor on success", async () => {
      const vendor = { id: "v1", name: "Acme Supplies" };
      mockService.findById.mockResolvedValue(vendor);
      const req = makeReq({ params: { id: "v1" } });
      const res = mockRes() as Response;

      await vendorController.getVendorById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ vendor }),
      );
    });

    it("returns 404 when vendor not found", async () => {
      mockService.findById.mockRejectedValue(
        makeAppError("Vendor not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await vendorController.getVendorById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.findById.mockRejectedValue(new Error("DB error"));
      const req = makeReq({ params: { id: "v1" } });
      const res = mockRes() as Response;

      await vendorController.getVendorById(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ─── getVendorProducts ─────────────────────────────────────────────────────

  describe("getVendorProducts", () => {
    it("returns 200 with paginated products", async () => {
      const result = { data: [], pagination: {} };
      mockService.findVendorProducts.mockResolvedValue(result);
      const req = makeReq({ params: { id: "v1" }, query: {} });
      const res = mockRes() as Response;

      await vendorController.getVendorProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: [], pagination: {} }),
      );
    });

    it("returns 404 when vendor not found", async () => {
      mockService.findVendorProducts.mockRejectedValue(
        makeAppError("Vendor not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await vendorController.getVendorProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.findVendorProducts.mockRejectedValue(new Error("DB error"));
      const req = makeReq({ params: { id: "v1" } });
      const res = mockRes() as Response;

      await vendorController.getVendorProducts(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ─── updateVendor ──────────────────────────────────────────────────────────

  describe("updateVendor", () => {
    it("returns 200 with updated vendor on success", async () => {
      const vendor = { id: "v1", name: "Updated Name" };
      mockService.update.mockResolvedValue(vendor);
      const req = makeReq({
        params: { id: "v1" },
        body: { name: "Updated Name" },
      });
      const res = mockRes() as Response;

      await vendorController.updateVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ vendor }),
      );
    });

    it("returns 400 on Zod validation error (empty name)", async () => {
      const req = makeReq({ params: { id: "v1" }, body: { name: "" } });
      const res = mockRes() as Response;

      await vendorController.updateVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it("returns 404 when vendor not found", async () => {
      mockService.update.mockRejectedValue(
        makeAppError("Vendor not found", 404),
      );
      const req = makeReq({ params: { id: "missing" }, body: { name: "X" } });
      const res = mockRes() as Response;

      await vendorController.updateVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 409 on name conflict", async () => {
      mockService.update.mockRejectedValue(
        makeAppError("Vendor with this name already exists", 409),
      );
      const req = makeReq({ params: { id: "v1" }, body: { name: "Taken" } });
      const res = mockRes() as Response;

      await vendorController.updateVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.update.mockRejectedValue(new Error("DB error"));
      const req = makeReq({ params: { id: "v1" }, body: { name: "X" } });
      const res = mockRes() as Response;

      await vendorController.updateVendor(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ─── deleteVendor ──────────────────────────────────────────────────────────

  describe("deleteVendor", () => {
    it("returns 200 on successful deletion", async () => {
      mockService.delete.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "v1" } });
      const res = mockRes() as Response;

      await vendorController.deleteVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when vendor not found", async () => {
      mockService.delete.mockRejectedValue(
        makeAppError("Vendor not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await vendorController.deleteVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when vendor has associated products", async () => {
      mockService.delete.mockRejectedValue(
        makeAppError(
          "Cannot delete vendor — 3 products are associated. Please reassign or remove those products first.",
          400,
          { productCount: 3 },
        ),
      );
      const req = makeReq({ params: { id: "v1" } });
      const res = mockRes() as Response;

      await vendorController.deleteVendor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ productCount: 3 }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.delete.mockRejectedValue(new Error("DB error"));
      const req = makeReq({ params: { id: "v1" } });
      const res = mockRes() as Response;

      await vendorController.deleteVendor(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
