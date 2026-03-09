import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./attribute-type.service", () => ({
  AttributeTypeService: vi.fn(),
  default: {
    list: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listValues: vi.fn(),
    createValue: vi.fn(),
    updateValue: vi.fn(),
    deleteValue: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

vi.mock("@/config/prisma", () => ({ default: {} }));

import attributeTypeController from "./attribute-type.controller";
import * as attributeTypeServiceModule from "./attribute-type.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = attributeTypeServiceModule.default as unknown as Record<
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

function makeAppError(message: string, statusCode: number) {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

describe("AttributeTypeController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("returns 200 with attribute types on success", async () => {
      const types = [{ id: "at1", name: "Color", code: "color" }];
      mockService.list.mockResolvedValue(types);
      const req = makeReq();
      const res = mockRes() as Response;

      await attributeTypeController.list(req, res);

      expect(mockService.list).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ attributeTypes: types }),
      );
    });
  });

  describe("create", () => {
    it("returns 201 with created attribute type on success", async () => {
      const attributeType = { id: "at1", name: "Color", code: "color" };
      mockService.create.mockResolvedValue(attributeType);
      const req = makeReq({ body: { name: "Color" } });
      const res = mockRes() as Response;

      await attributeTypeController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ attributeType }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ body: {} });
      const res = mockRes() as Response;

      await attributeTypeController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it("returns 409 when code already exists", async () => {
      mockService.create.mockRejectedValue(
        makeAppError("An attribute type with this code already exists", 409),
      );
      const req = makeReq({ body: { name: "Color" } });
      const res = mockRes() as Response;

      await attributeTypeController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe("getById", () => {
    it("returns 200 with attribute type on success", async () => {
      const attributeType = { id: "at1", name: "Color" };
      mockService.getById.mockResolvedValue(attributeType);
      const req = makeReq({ params: { id: "at1" } });
      const res = mockRes() as Response;

      await attributeTypeController.getById(req, res);

      expect(mockService.getById).toHaveBeenCalledWith("at1", "t1");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 when id is missing", async () => {
      const req = makeReq({ params: {} });
      const res = mockRes() as Response;

      await attributeTypeController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.getById).not.toHaveBeenCalled();
    });

    it("returns 404 when attribute type not found", async () => {
      mockService.getById.mockRejectedValue(
        makeAppError("Attribute type not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await attributeTypeController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("update", () => {
    it("returns 200 with updated attribute type on success", async () => {
      const attributeType = { id: "at1", name: "Updated" };
      mockService.update.mockResolvedValue(attributeType);
      const req = makeReq({ params: { id: "at1" }, body: { name: "Updated" } });
      const res = mockRes() as Response;

      await attributeTypeController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when attribute type not found", async () => {
      mockService.update.mockRejectedValue(
        makeAppError("Attribute type not found", 404),
      );
      const req = makeReq({ params: { id: "missing" }, body: { name: "X" } });
      const res = mockRes() as Response;

      await attributeTypeController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("delete", () => {
    it("returns 200 on successful deletion", async () => {
      mockService.delete.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "at1" } });
      const res = mockRes() as Response;

      await attributeTypeController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when attribute type not found", async () => {
      mockService.delete.mockRejectedValue(
        makeAppError("Attribute type not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await attributeTypeController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("listValues", () => {
    it("returns 200 with values on success", async () => {
      const values = [{ id: "av1", value: "Red" }];
      mockService.listValues.mockResolvedValue(values);
      const req = makeReq({ params: { typeId: "at1" } });
      const res = mockRes() as Response;

      await attributeTypeController.listValues(req, res);

      expect(mockService.listValues).toHaveBeenCalledWith("at1", "t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ values, attributeType: "at1" }),
      );
    });
  });

  describe("createValue", () => {
    it("returns 201 with created attribute value on success", async () => {
      const attributeValue = { id: "av1", value: "Red" };
      mockService.createValue.mockResolvedValue(attributeValue);
      const req = makeReq({
        params: { typeId: "at1" },
        body: { value: "Red" },
      });
      const res = mockRes() as Response;

      await attributeTypeController.createValue(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ params: { typeId: "at1" }, body: {} });
      const res = mockRes() as Response;

      await attributeTypeController.createValue(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.createValue).not.toHaveBeenCalled();
    });
  });

  describe("updateValue", () => {
    it("returns 200 with updated value on success", async () => {
      const attributeValue = { id: "av1", value: "Blue" };
      mockService.updateValue.mockResolvedValue(attributeValue);
      const req = makeReq({
        params: { typeId: "at1", valueId: "av1" },
        body: { value: "Blue" },
      });
      const res = mockRes() as Response;

      await attributeTypeController.updateValue(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("deleteValue", () => {
    it("returns 200 on successful deletion", async () => {
      mockService.deleteValue.mockResolvedValue(undefined);
      const req = makeReq({ params: { typeId: "at1", valueId: "av1" } });
      const res = mockRes() as Response;

      await attributeTypeController.deleteValue(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
