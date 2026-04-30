import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

vi.mock("./redirects.service", () => ({
  default: {
    listAll: vi.fn(),
    create: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./redirects.controller";
import * as serviceModule from "./redirects.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = serviceModule.default as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function makeAppError(message: string, statusCode: number): Error {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

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

const sampleRedirect = {
  id: "r1",
  tenantId: "t1",
  fromPath: "/old",
  toPath: "/new",
  statusCode: 301,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("RedirectsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listRedirects", () => {
    it("returns 200 with redirects array", async () => {
      mockService.listAll.mockResolvedValue([sampleRedirect]);
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listRedirects(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: { redirects: [sampleRedirect] } }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.listAll.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listRedirects(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("createRedirect", () => {
    it("returns 201 with created redirect", async () => {
      mockService.create.mockResolvedValue(sampleRedirect);
      const req = makeReq({
        body: { fromPath: "/old", toPath: "/new", statusCode: 301 },
      });
      const res = mockRes() as Response;

      await controller.createRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: { redirect: sampleRedirect } }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ body: { fromPath: "no-slash", toPath: "/b" } });
      const res = mockRes() as Response;

      await controller.createRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 409 on duplicate fromPath", async () => {
      mockService.create.mockRejectedValue(
        makeAppError('A redirect from "/old" already exists', 409),
      );
      const req = makeReq({
        body: { fromPath: "/old", toPath: "/new" },
      });
      const res = mockRes() as Response;

      await controller.createRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.create.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        body: { fromPath: "/old", toPath: "/new" },
      });
      const res = mockRes() as Response;

      await controller.createRedirect(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getRedirect", () => {
    it("returns 200 with redirect", async () => {
      mockService.getById.mockResolvedValue(sampleRedirect);
      const req = makeReq({ params: { id: "r1" } });
      const res = mockRes() as Response;

      await controller.getRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when not found", async () => {
      mockService.getById.mockRejectedValue(
        makeAppError("Redirect not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await controller.getRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("updateRedirect", () => {
    it("returns 200 with updated redirect", async () => {
      const updated = { ...sampleRedirect, isActive: false };
      mockService.update.mockResolvedValue(updated);
      const req = makeReq({
        params: { id: "r1" },
        body: { isActive: false },
      });
      const res = mockRes() as Response;

      await controller.updateRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 409 on cycle detection", async () => {
      mockService.update.mockRejectedValue(
        makeAppError("Redirect cycle detected: /a → … → /a", 409),
      );
      const req = makeReq({
        params: { id: "r1" },
        body: { toPath: "/a" },
      });
      const res = mockRes() as Response;

      await controller.updateRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe("deleteRedirect", () => {
    it("returns 200 on successful delete", async () => {
      mockService.delete.mockResolvedValue(sampleRedirect);
      const req = makeReq({ params: { id: "r1" } });
      const res = mockRes() as Response;

      await controller.deleteRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when redirect not found", async () => {
      mockService.delete.mockRejectedValue(
        makeAppError("Redirect not found", 404),
      );
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await controller.deleteRedirect(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
