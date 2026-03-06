import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./company.service", () => ({
  default: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    listForSelect: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import companyController from "./company.controller";
import * as companyServiceModule from "./company.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = companyServiceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
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

describe("CompanyController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("returns 201 with created company on success", async () => {
      const company = { id: "1", name: "Acme" };
      mockService.create.mockResolvedValue(company);
      const req = makeReq({ body: { name: "Acme" } });
      const res = mockRes() as Response;

      await companyController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ company }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ body: { name: "" } });
      const res = mockRes() as Response;

      await companyController.create(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ body: { name: "Acme" } });
      const res = mockRes() as Response;

      await companyController.create(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getAll", () => {
    it("returns 200 with paginated result on success", async () => {
      const result = { data: [], pagination: { totalItems: 0 } };
      mockService.getAll.mockResolvedValue(result);
      const req = makeReq();
      const res = mockRes() as Response;

      await companyController.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: [], pagination: expect.any(Object) }),
      );
    });
  });

  describe("getById", () => {
    it("returns 200 with company on success", async () => {
      const company = { id: "1", name: "Acme" };
      mockService.getById.mockResolvedValue(company);
      const req = makeReq({ params: { id: "1" } });
      const res = mockRes() as Response;

      await companyController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ company }),
      );
    });

    it("returns 404 when company not found", async () => {
      const err = new Error("Company not found") as Error & {
        statusCode: number;
      };
      err.statusCode = 404;
      mockService.getById.mockRejectedValue(err);
      const req = makeReq({ params: { id: "999" } });
      const res = mockRes() as Response;

      await companyController.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("update", () => {
    it("returns 200 with updated company on success", async () => {
      const company = { id: "1", name: "Acme Updated" };
      mockService.update.mockResolvedValue(company);
      const req = makeReq({
        params: { id: "1" },
        body: { name: "Acme Updated" },
      });
      const res = mockRes() as Response;

      await companyController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ company }),
      );
    });

    it("returns 404 when company not found", async () => {
      const err = new Error("Company not found") as Error & {
        statusCode: number;
      };
      err.statusCode = 404;
      mockService.update.mockRejectedValue(err);
      const req = makeReq({
        params: { id: "999" },
        body: { name: "New" },
      });
      const res = mockRes() as Response;

      await companyController.update(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("delete", () => {
    it("returns 200 on successful delete", async () => {
      mockService.delete.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "1" } });
      const res = mockRes() as Response;

      await companyController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when company not found", async () => {
      const err = new Error("Company not found") as Error & {
        statusCode: number;
      };
      err.statusCode = 404;
      mockService.delete.mockRejectedValue(err);
      const req = makeReq({ params: { id: "999" } });
      const res = mockRes() as Response;

      await companyController.delete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("listForSelect", () => {
    it("returns 200 with companies array on success", async () => {
      const companies = [{ id: "1", name: "Acme" }];
      mockService.listForSelect.mockResolvedValue(companies);
      const req = makeReq();
      const res = mockRes() as Response;

      await companyController.listForSelect(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ companies }),
      );
    });
  });
});
