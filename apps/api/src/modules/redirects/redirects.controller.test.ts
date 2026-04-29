import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { createError } from "@/middlewares/errorHandler";

vi.mock("./redirects.service", () => ({
  default: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/shared/auth/getAuthContext", () => ({
  getAuthContext: vi.fn(),
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

import redirectsController from "./redirects.controller";
import * as serviceModule from "./redirects.service";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";

const mockService = serviceModule.default as Record<
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
    user: { id: "u1", tenantId: "t1", role: "admin" },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("RedirectsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAuthContext as any).mockReturnValue({ tenantId: "t1" });
  });

  describe("listRedirects", () => {
    it("returns list of redirects on success", async () => {
      const redirects = [
        {
          id: "r1",
          tenantId: "t1",
          fromPath: "/old",
          toPath: "/new",
          statusCode: 301,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockService.getAll.mockResolvedValue(redirects);
      const req = makeReq();
      const res = mockRes() as Response;

      await redirectsController.listRedirects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ redirects }),
        }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.getAll.mockRejectedValue(new Error("DB error"));
      const req = makeReq();
      const res = mockRes() as Response;

      await redirectsController.listRedirects(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("createRedirect", () => {
    it("returns 201 with created redirect on success", async () => {
      const redirect = {
        id: "r1",
        tenantId: "t1",
        fromPath: "/old",
        toPath: "/new",
        statusCode: 301,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockService.create.mockResolvedValue(redirect);
      const req = makeReq({
        body: {
          fromPath: "/old",
          toPath: "/new",
          statusCode: 301,
        },
      });
      const res = mockRes() as Response;

      await redirectsController.createRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ redirect }),
        }),
      );
    });

    it("returns 400 on validation error", async () => {
      const req = makeReq({
        body: {
          fromPath: "invalid",
          toPath: "/new",
        },
      });
      const res = mockRes() as Response;

      await redirectsController.createRedirect(req, res);

      // Validation errors are handled by sendControllerError
      expect(sendControllerError).toHaveBeenCalled();
    });

    it("returns 409 on cycle error", async () => {
      const err = createError("Cycle detected", 409);
      mockService.create.mockRejectedValue(err);
      const req = makeReq({
        body: {
          fromPath: "/a",
          toPath: "/b",
          statusCode: 301,
        },
      });
      const res = mockRes() as Response;

      await redirectsController.createRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe("getRedirect", () => {
    it("returns redirect on success", async () => {
      const redirect = {
        id: "r1",
        tenantId: "t1",
        fromPath: "/old",
        toPath: "/new",
        statusCode: 301,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockService.getById.mockResolvedValue(redirect);
      const req = makeReq({ params: { id: "r1" } });
      const res = mockRes() as Response;

      await redirectsController.getRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when redirect not found", async () => {
      const err = createError("Redirect not found", 404);
      mockService.getById.mockRejectedValue(err);
      const req = makeReq({ params: { id: "r99" } });
      const res = mockRes() as Response;

      await redirectsController.getRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("updateRedirect", () => {
    it("returns updated redirect on success", async () => {
      const redirect = {
        id: "r1",
        tenantId: "t1",
        fromPath: "/old",
        toPath: "/new-destination",
        statusCode: 302,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockService.update.mockResolvedValue(redirect);
      const req = makeReq({
        params: { id: "r1" },
        body: {
          toPath: "/new-destination",
          statusCode: 302,
          isActive: false,
        },
      });
      const res = mockRes() as Response;

      await redirectsController.updateRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("deleteRedirect", () => {
    it("returns deleted redirect on success", async () => {
      const redirect = {
        id: "r1",
        tenantId: "t1",
        fromPath: "/old",
        toPath: "/new",
        statusCode: 301,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockService.delete.mockResolvedValue(redirect);
      const req = makeReq({ params: { id: "r1" } });
      const res = mockRes() as Response;

      await redirectsController.deleteRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });
});
