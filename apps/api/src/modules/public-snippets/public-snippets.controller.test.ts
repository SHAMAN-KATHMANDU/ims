import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("@/config/prisma", () => ({
  default: {
    siteSnippet: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/modules/sites/sites.repository", () => ({
  default: {
    findConfig: vi.fn(),
  },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

import controller from "./public-snippets.controller";
import prisma from "@/config/prisma";
import sitesRepo from "@/modules/sites/sites.repository";
import { sendControllerError } from "@/utils/controllerError";

const mockPrisma = prisma as unknown as {
  siteSnippet: { findFirst: ReturnType<typeof vi.fn> };
};
const mockSitesRepo = sitesRepo as unknown as {
  findConfig: ReturnType<typeof vi.fn>;
};

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    tenant: { id: "t1", name: "Acme", slug: "acme", isActive: true },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

describe("PublicSnippetsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getById", () => {
    it("returns 404 when site config is missing", async () => {
      mockSitesRepo.findConfig.mockResolvedValue(null);
      const req = makeReq({ params: { id: "snip-1" } });
      const res = mockRes() as Response;

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Snippet not found" }),
      );
      expect(mockPrisma.siteSnippet.findFirst).not.toHaveBeenCalled();
    });

    it("returns 404 when websiteEnabled is false", async () => {
      mockSitesRepo.findConfig.mockResolvedValue({
        id: "sc1",
        tenantId: "t1",
        websiteEnabled: false,
        isPublished: true,
        templateId: "tpl1",
        branding: null,
        contact: null,
        features: null,
        seo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: null,
      });
      const req = makeReq({ params: { id: "snip-1" } });
      const res = mockRes() as Response;

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Snippet not found" }),
      );
      expect(mockPrisma.siteSnippet.findFirst).not.toHaveBeenCalled();
    });

    it("returns 404 when isPublished is false", async () => {
      mockSitesRepo.findConfig.mockResolvedValue({
        id: "sc1",
        tenantId: "t1",
        websiteEnabled: true,
        isPublished: false,
        templateId: "tpl1",
        branding: null,
        contact: null,
        features: null,
        seo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: null,
      });
      const req = makeReq({ params: { id: "snip-1" } });
      const res = mockRes() as Response;

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Snippet not found" }),
      );
      expect(mockPrisma.siteSnippet.findFirst).not.toHaveBeenCalled();
    });

    it("returns 200 with snippet when published and enabled", async () => {
      mockSitesRepo.findConfig.mockResolvedValue({
        id: "sc1",
        tenantId: "t1",
        websiteEnabled: true,
        isPublished: true,
        templateId: "tpl1",
        branding: null,
        contact: null,
        features: null,
        seo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: null,
      });
      mockPrisma.siteSnippet.findFirst.mockResolvedValue({
        id: "snip-1",
        slug: "faq",
        title: "FAQ",
        body: "Some content",
      });
      const req = makeReq({ params: { id: "snip-1" } });
      const res = mockRes() as Response;

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "OK",
          snippet: {
            id: "snip-1",
            slug: "faq",
            title: "FAQ",
            body: "Some content",
          },
        }),
      );
    });

    it("queries siteSnippet scoped by id and tenantId", async () => {
      mockSitesRepo.findConfig.mockResolvedValue({
        id: "sc1",
        tenantId: "t1",
        websiteEnabled: true,
        isPublished: true,
        templateId: "tpl1",
        branding: null,
        contact: null,
        features: null,
        seo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: null,
      });
      mockPrisma.siteSnippet.findFirst.mockResolvedValue(null);
      const req = makeReq({
        tenant: { id: "t1" },
        params: { id: "snip-123" },
      } as any);
      const res = mockRes() as Response;

      await controller.getById(req, res);

      expect(mockPrisma.siteSnippet.findFirst).toHaveBeenCalledWith({
        where: { id: "snip-123", tenantId: "t1" },
        select: { id: true, slug: true, title: true, body: true },
      });
    });

    it("returns 404 when snippet is not found", async () => {
      mockSitesRepo.findConfig.mockResolvedValue({
        id: "sc1",
        tenantId: "t1",
        websiteEnabled: true,
        isPublished: true,
        templateId: "tpl1",
        branding: null,
        contact: null,
        features: null,
        seo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        template: null,
      });
      mockPrisma.siteSnippet.findFirst.mockResolvedValue(null);
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Snippet not found" }),
      );
    });

    it("returns 400 when tenant is not resolved on req", async () => {
      const mockSendError = sendControllerError as unknown as ReturnType<
        typeof vi.fn
      >;
      mockSendError.mockReturnValue(undefined);
      const req = makeReq({
        tenant: undefined,
        params: { id: "snip-1" },
      } as any);
      const res = mockRes() as Response;

      await controller.getById(req, res);

      expect(mockSendError).toHaveBeenCalled();
      expect(mockSitesRepo.findConfig).not.toHaveBeenCalled();
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockSitesRepo.findConfig.mockRejectedValue(new Error("DB error"));
      const req = makeReq({ params: { id: "snip-1" } });
      const res = mockRes() as Response;

      await controller.getById(req, res);

      expect(sendControllerError).toHaveBeenCalledWith(
        req,
        res,
        expect.any(Error),
        "Public snippet read error",
      );
    });
  });
});
