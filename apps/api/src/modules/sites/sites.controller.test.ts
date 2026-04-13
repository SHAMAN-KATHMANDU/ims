import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./sites.service", () => ({
  default: {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    listTemplates: vi.fn(),
    pickTemplate: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/shared/auth/getAuthContext", () => ({
  getAuthContext: vi.fn(() => ({ id: "u1", tenantId: "t1", role: "admin" })),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./sites.controller";
import * as serviceModule from "./sites.service";
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

const sampleConfig = {
  id: "sc1",
  tenantId: "t1",
  websiteEnabled: true,
  templateId: "tpl1",
  isPublished: false,
};

describe("SitesController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getConfig", () => {
    it("returns 200 with siteConfig", async () => {
      mockService.getConfig.mockResolvedValue(sampleConfig);
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.getConfig(req, res);
      expect(mockService.getConfig).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ siteConfig: sampleConfig }),
      );
    });

    it("returns 403 when website feature disabled", async () => {
      mockService.getConfig.mockRejectedValue(
        Object.assign(new Error("Website feature is disabled"), {
          statusCode: 403,
        }),
      );
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.getConfig(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.getConfig.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.getConfig(req, res);
      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("updateConfig", () => {
    it("returns 200 on valid partial update", async () => {
      mockService.updateConfig.mockResolvedValue(sampleConfig);
      const req = makeReq({
        body: { branding: { theme: "dark" } },
      });
      const res = mockRes() as Response;

      await controller.updateConfig(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockService.updateConfig).toHaveBeenCalledWith("t1", {
        branding: { theme: "dark" },
      });
    });

    it("returns 400 when body is empty (no fields provided)", async () => {
      const req = makeReq({ body: {} });
      const res = mockRes() as Response;

      await controller.updateConfig(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.updateConfig).not.toHaveBeenCalled();
    });

    it("returns 403 when website feature disabled", async () => {
      mockService.updateConfig.mockRejectedValue(
        Object.assign(new Error("Website feature is disabled"), {
          statusCode: 403,
        }),
      );
      const req = makeReq({ body: { branding: { theme: "dark" } } });
      const res = mockRes() as Response;

      await controller.updateConfig(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("listTemplates", () => {
    it("returns 200 with templates array", async () => {
      mockService.listTemplates.mockResolvedValue([{ slug: "minimal" }]);
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listTemplates(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          templates: [{ slug: "minimal" }],
        }),
      );
    });
  });

  describe("pickTemplate", () => {
    it("returns 200 when applied", async () => {
      mockService.pickTemplate.mockResolvedValue(sampleConfig);
      const req = makeReq({
        body: { templateSlug: "luxury", resetBranding: true },
      });
      const res = mockRes() as Response;

      await controller.pickTemplate(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockService.pickTemplate).toHaveBeenCalledWith("t1", {
        templateSlug: "luxury",
        resetBranding: true,
      });
    });

    it("returns 400 when templateSlug is missing", async () => {
      const req = makeReq({ body: {} });
      const res = mockRes() as Response;

      await controller.pickTemplate(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.pickTemplate).not.toHaveBeenCalled();
    });

    it("returns 404 when template not found", async () => {
      mockService.pickTemplate.mockRejectedValue(
        Object.assign(new Error("Template not found"), { statusCode: 404 }),
      );
      const req = makeReq({ body: { templateSlug: "ghost" } });
      const res = mockRes() as Response;

      await controller.pickTemplate(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("publish", () => {
    it("returns 200 on successful publish", async () => {
      mockService.publish.mockResolvedValue({
        ...sampleConfig,
        isPublished: true,
      });
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.publish(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 when no template picked", async () => {
      mockService.publish.mockRejectedValue(
        Object.assign(new Error("Pick a template before publishing"), {
          statusCode: 400,
        }),
      );
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.publish(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("unpublish", () => {
    it("returns 200", async () => {
      mockService.unpublish.mockResolvedValue({
        ...sampleConfig,
        isPublished: false,
      });
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.unpublish(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
