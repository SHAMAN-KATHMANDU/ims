import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./location.service", () => ({
  LocationService: vi.fn(),
  default: {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getInventory: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({ default: {} }));

import { createError } from "@/middlewares/errorHandler";
import locationController from "./location.controller";
import * as locationServiceModule from "./location.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = locationServiceModule.default as Record<
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
    ...overrides,
  } as unknown as Request;
}

describe("LocationController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createLocation", () => {
    it("returns 201 with created location on success", async () => {
      const location = { id: "loc1", name: "Main Warehouse" };
      mockService.create.mockResolvedValue(location);
      const req = makeReq({ body: { name: "Main Warehouse" } });
      const res = mockRes() as Response;

      await locationController.createLocation(req, res);

      expect(mockService.create).toHaveBeenCalledWith("t1", expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ location }),
      );
    });

    it("returns 400 when name is missing (Zod validation)", async () => {
      const req = makeReq({ body: {} });
      const res = mockRes() as Response;

      await locationController.createLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it("returns 409 when location name already exists", async () => {
      mockService.create.mockRejectedValue(
        createError("Location with this name already exists", 409),
      );
      const req = makeReq({ body: { name: "Existing" } });
      const res = mockRes() as Response;

      await locationController.createLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ body: { name: "Store" } });
      const res = mockRes() as Response;

      await locationController.createLocation(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getAllLocations", () => {
    it("returns 200 with paginated locations", async () => {
      const result = { data: [], pagination: {} };
      mockService.findAll.mockResolvedValue(result);
      const req = makeReq({ query: { page: "1", limit: "10" } });
      const res = mockRes() as Response;

      await locationController.getAllLocations(req, res);

      expect(mockService.findAll).toHaveBeenCalledWith(
        "t1",
        expect.any(Object),
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getLocationById", () => {
    it("returns 200 with location on success", async () => {
      const location = { id: "loc1", name: "Main Warehouse" };
      mockService.findById.mockResolvedValue(location);
      const req = makeReq({ params: { id: "loc1" } });
      const res = mockRes() as Response;

      await locationController.getLocationById(req, res);

      expect(mockService.findById).toHaveBeenCalledWith("loc1", "t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ location }),
      );
    });

    it("returns 404 when location not found", async () => {
      mockService.findById.mockRejectedValue(
        createError("Location not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await locationController.getLocationById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("updateLocation", () => {
    it("returns 200 with updated location on success", async () => {
      const location = { id: "loc1", name: "Updated Name" };
      mockService.update.mockResolvedValue(location);
      const req = makeReq({
        params: { id: "loc1" },
        body: { name: "Updated Name" },
      });
      const res = mockRes() as Response;

      await locationController.updateLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ location }),
      );
    });

    it("returns 404 when location not found", async () => {
      mockService.update.mockRejectedValue(
        createError("Location not found", 404),
      );
      const req = makeReq({
        params: { id: "missing" },
        body: { name: "New Name" },
      });
      const res = mockRes() as Response;

      await locationController.updateLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("deleteLocation", () => {
    it("returns 200 on successful deletion", async () => {
      mockService.delete.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "loc1" } });
      const res = mockRes() as Response;

      await locationController.deleteLocation(req, res);

      expect(mockService.delete).toHaveBeenCalledWith("loc1", "t1");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when location not found", async () => {
      mockService.delete.mockRejectedValue(
        createError("Location not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await locationController.deleteLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when location has pending transfers", async () => {
      mockService.delete.mockRejectedValue(
        createError(
          "Cannot delete location with pending transfers. Complete or cancel all transfers first.",
          400,
        ),
      );
      const req = makeReq({ params: { id: "loc1" } });
      const res = mockRes() as Response;

      await locationController.deleteLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("getLocationInventory", () => {
    it("returns 200 with inventory and pagination", async () => {
      const result = {
        location: { id: "loc1", name: "Main" },
        data: [],
        pagination: {},
      };
      mockService.getInventory.mockResolvedValue(result);
      const req = makeReq({ params: { id: "loc1" }, query: {} });
      const res = mockRes() as Response;

      await locationController.getLocationInventory(req, res);

      expect(mockService.getInventory).toHaveBeenCalledWith(
        "loc1",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when location not found", async () => {
      mockService.getInventory.mockRejectedValue(
        createError("Location not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await locationController.getLocationInventory(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
