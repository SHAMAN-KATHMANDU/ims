import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./site-layouts.service", () => ({
  default: {
    list: vi.fn(),
    get: vi.fn(),
    upsertDraft: vi.fn(),
    publishDraft: vi.fn(),
    deleteLayout: vi.fn(),
    mintPreviewUrl: vi.fn(),
    resetScopeFromTemplate: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/shared/auth/getAuthContext", () => ({
  getAuthContext: vi.fn(() => ({ id: "u1", tenantId: "t1", role: "admin" })),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./site-layouts.controller";
import * as serviceModule from "./site-layouts.service";
import { sendControllerError } from "@/utils/controllerError";

const mockService = serviceModule.default as unknown as Record<
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

const sampleLayout = {
  id: "sl1",
  tenantId: "t1",
  scope: "home",
  pageId: null,
  blocks: [],
  draftBlocks: null,
  version: 1,
};

describe("SiteLayoutsController", () => {
  beforeEach(() => vi.clearAllMocks());

  // -------------------------------------------------------------------------
  describe("list", () => {
    it("returns 200 with layouts array", async () => {
      mockService.list.mockResolvedValue([sampleLayout]);
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ layouts: [sampleLayout] }),
      );
    });

    it("returns 400 for invalid scope query param", async () => {
      const req = makeReq({ query: { scope: "not-a-scope" } });
      const res = mockRes() as Response;

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.list).not.toHaveBeenCalled();
    });

    it("returns 403 when website feature is disabled", async () => {
      mockService.list.mockRejectedValue(
        Object.assign(new Error("Disabled"), { statusCode: 403 }),
      );
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.list(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.list.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.list(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("get", () => {
    it("returns 200 with layout", async () => {
      mockService.get.mockResolvedValue(sampleLayout);
      const req = makeReq({ params: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.get(req, res);

      expect(mockService.get).toHaveBeenCalledWith("t1", {
        scope: "home",
        pageId: null,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ layout: sampleLayout }),
      );
    });

    it("extracts pageId from query string", async () => {
      mockService.get.mockResolvedValue(sampleLayout);
      const req = makeReq({
        params: { scope: "page" },
        query: { pageId: "00000000-0000-0000-0000-000000000001" },
      });
      const res = mockRes() as Response;

      await controller.get(req, res);

      expect(mockService.get).toHaveBeenCalledWith("t1", {
        scope: "page",
        pageId: "00000000-0000-0000-0000-000000000001",
      });
    });

    it("returns 400 for invalid scope param", async () => {
      const req = makeReq({ params: { scope: "bad-scope" } });
      const res = mockRes() as Response;

      await controller.get(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.get).not.toHaveBeenCalled();
    });

    it("returns 404 when layout not found", async () => {
      mockService.get.mockRejectedValue(
        Object.assign(new Error("Layout not found"), { statusCode: 404 }),
      );
      const req = makeReq({ params: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.get(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.get.mockRejectedValue(new Error("Crash"));
      const req = makeReq({ params: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.get(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("upsert", () => {
    it("returns 200 with saved draft layout", async () => {
      mockService.upsertDraft.mockResolvedValue(sampleLayout);
      const req = makeReq({
        body: { scope: "home", blocks: [] },
      });
      const res = mockRes() as Response;

      await controller.upsert(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ layout: sampleLayout }),
      );
    });

    it("returns 400 for invalid body (missing blocks)", async () => {
      const req = makeReq({ body: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.upsert(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.upsertDraft).not.toHaveBeenCalled();
    });

    it("returns 400 for invalid scope in body", async () => {
      const req = makeReq({
        body: { scope: "not-real", blocks: [] },
      });
      const res = mockRes() as Response;

      await controller.upsert(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.upsertDraft.mockRejectedValue(new Error("Crash"));
      const req = makeReq({
        body: { scope: "home", blocks: [] },
      });
      const res = mockRes() as Response;

      await controller.upsert(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("publish", () => {
    it("returns 200 with published layout", async () => {
      mockService.publishDraft.mockResolvedValue({
        ...sampleLayout,
        version: 2,
      });
      const req = makeReq({ params: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.publish(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          layout: expect.objectContaining({ version: 2 }),
        }),
      );
    });

    it("returns 404 when no draft exists", async () => {
      mockService.publishDraft.mockRejectedValue(
        Object.assign(new Error("Layout not found"), { statusCode: 404 }),
      );
      const req = makeReq({ params: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.publish(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 for invalid scope", async () => {
      const req = makeReq({ params: { scope: "bad" } });
      const res = mockRes() as Response;

      await controller.publish(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.publishDraft).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe("getPreviewUrl", () => {
    it("returns 200 with preview url", async () => {
      mockService.mintPreviewUrl.mockResolvedValue({
        url: "https://preview.example.com/home",
      });
      const req = makeReq({ params: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.getPreviewUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ url: "https://preview.example.com/home" }),
      );
    });

    it("returns 503 when no preview target configured", async () => {
      mockService.mintPreviewUrl.mockRejectedValue(
        Object.assign(new Error("No preview target"), { statusCode: 503 }),
      );
      const req = makeReq({ params: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.getPreviewUrl(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });

  // -------------------------------------------------------------------------
  describe("resetFromTemplate", () => {
    it("returns 200 with reset layout", async () => {
      mockService.resetScopeFromTemplate.mockResolvedValue(sampleLayout);
      const req = makeReq({ params: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.resetFromTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 when no template is picked", async () => {
      mockService.resetScopeFromTemplate.mockRejectedValue(
        Object.assign(new Error("Pick a template first"), { statusCode: 400 }),
      );
      const req = makeReq({ params: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.resetFromTemplate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // -------------------------------------------------------------------------
  describe("remove", () => {
    it("returns 200 on successful delete", async () => {
      mockService.deleteLayout.mockResolvedValue(undefined);
      const req = makeReq({ params: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when layout does not exist", async () => {
      mockService.deleteLayout.mockRejectedValue(
        Object.assign(new Error("Layout not found"), { statusCode: 404 }),
      );
      const req = makeReq({ params: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 for invalid scope", async () => {
      const req = makeReq({ params: { scope: "bad" } });
      const res = mockRes() as Response;

      await controller.remove(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.deleteLayout).not.toHaveBeenCalled();
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.deleteLayout.mockRejectedValue(new Error("Crash"));
      const req = makeReq({ params: { scope: "home" } });
      const res = mockRes() as Response;

      await controller.remove(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
