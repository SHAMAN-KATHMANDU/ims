import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./platform-websites.service", () => ({
  default: {
    getSiteConfig: vi.fn(),
    enableWebsite: vi.fn(),
    disableWebsite: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./platform-websites.controller";
import * as serviceModule from "./platform-websites.service";
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
    user: {
      id: "u1",
      tenantId: "t1",
      role: "platformAdmin",
      tenantSlug: "acme",
    },
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
};

describe("PlatformWebsitesController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSiteConfig", () => {
    it("returns 200 with siteConfig on success", async () => {
      mockService.getSiteConfig.mockResolvedValue(sampleConfig);
      const req = makeReq({ params: { tenantId: "t1" } });
      const res = mockRes() as Response;

      await controller.getSiteConfig(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ siteConfig: sampleConfig }),
      );
    });

    it("returns 404 when service throws", async () => {
      mockService.getSiteConfig.mockRejectedValue(
        Object.assign(new Error("Tenant not found"), { statusCode: 404 }),
      );
      const req = makeReq({ params: { tenantId: "missing" } });
      const res = mockRes() as Response;

      await controller.getSiteConfig(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("enableWebsite", () => {
    it("returns 200 with enabled siteConfig", async () => {
      mockService.enableWebsite.mockResolvedValue(sampleConfig);
      const req = makeReq({
        params: { tenantId: "t1" },
        body: { templateSlug: "minimal" },
      });
      const res = mockRes() as Response;

      await controller.enableWebsite(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockService.enableWebsite).toHaveBeenCalledWith("t1", {
        templateSlug: "minimal",
      });
    });

    it("accepts empty body (no template pre-pick)", async () => {
      mockService.enableWebsite.mockResolvedValue(sampleConfig);
      const req = makeReq({ params: { tenantId: "t1" }, body: {} });
      const res = mockRes() as Response;

      await controller.enableWebsite(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockService.enableWebsite).toHaveBeenCalledWith("t1", {});
    });

    it("returns 400 when templateSlug is invalid", async () => {
      const req = makeReq({
        params: { tenantId: "t1" },
        body: { templateSlug: "" },
      });
      const res = mockRes() as Response;

      await controller.enableWebsite(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.enableWebsite).not.toHaveBeenCalled();
    });

    it("returns 404 when template missing", async () => {
      mockService.enableWebsite.mockRejectedValue(
        Object.assign(new Error("Template not found"), { statusCode: 404 }),
      );
      const req = makeReq({
        params: { tenantId: "t1" },
        body: { templateSlug: "ghost" },
      });
      const res = mockRes() as Response;

      await controller.enableWebsite(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.enableWebsite.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ params: { tenantId: "t1" }, body: {} });
      const res = mockRes() as Response;

      await controller.enableWebsite(req, res);
      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("disableWebsite", () => {
    it("returns 200 with disabled siteConfig", async () => {
      mockService.disableWebsite.mockResolvedValue({
        ...sampleConfig,
        websiteEnabled: false,
        isPublished: false,
      });
      const req = makeReq({ params: { tenantId: "t1" } });
      const res = mockRes() as Response;

      await controller.disableWebsite(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockService.disableWebsite).toHaveBeenCalledWith("t1");
    });

    it("returns 404 when site config missing", async () => {
      mockService.disableWebsite.mockRejectedValue(
        Object.assign(new Error("Website feature is not enabled"), {
          statusCode: 404,
        }),
      );
      const req = makeReq({ params: { tenantId: "t1" } });
      const res = mockRes() as Response;

      await controller.disableWebsite(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
