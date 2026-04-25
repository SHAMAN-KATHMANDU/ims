import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("@/modules/platform-domains/platform-domains.service", () => ({
  default: {
    listTenantDomains: vi.fn(),
    addDomain: vi.fn(),
    deleteDomain: vi.fn(),
    getVerificationInstructions: vi.fn(),
    verifyDomain: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./tenant.controller";
import * as serviceModule from "@/modules/platform-domains/platform-domains.service";
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
      role: "admin",
      tenantSlug: "acme",
    },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

function sampleDomain(overrides: Record<string, unknown> = {}) {
  return {
    id: "d1",
    tenantId: "t1",
    hostname: "www.acme.com",
    appType: "WEBSITE",
    isPrimary: false,
    verifyToken: "tok",
    verifiedAt: null,
    tlsStatus: "PENDING",
    tlsLastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("TenantController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // listMyDomains
  // ============================================================
  describe("listMyDomains", () => {
    it("returns 200 with domains on success", async () => {
      mockService.listTenantDomains.mockResolvedValue([sampleDomain()]);
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listMyDomains(req, res);

      expect(mockService.listTenantDomains).toHaveBeenCalledWith(
        "t1",
        undefined,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ domains: expect.any(Array) }),
      );
    });

    it("forwards appType query filter", async () => {
      mockService.listTenantDomains.mockResolvedValue([]);
      const req = makeReq({ query: { appType: "IMS" } });
      const res = mockRes() as Response;

      await controller.listMyDomains(req, res);
      expect(mockService.listTenantDomains).toHaveBeenCalledWith("t1", "IMS");
    });

    it("returns 404 when service throws statusCode 404", async () => {
      const err = Object.assign(new Error("Tenant not found"), {
        statusCode: 404,
      });
      mockService.listTenantDomains.mockRejectedValue(err);
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listMyDomains(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.listTenantDomains.mockRejectedValue(new Error("DB down"));
      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listMyDomains(req, res);
      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ============================================================
  // addMyDomain
  // ============================================================
  describe("addMyDomain", () => {
    it("returns 201 with created domain on success", async () => {
      mockService.addDomain.mockResolvedValue(sampleDomain());
      const req = makeReq({
        body: { hostname: "www.acme.com", appType: "WEBSITE" },
      });
      const res = mockRes() as Response;

      await controller.addMyDomain(req, res);

      expect(mockService.addDomain).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          hostname: "www.acme.com",
          appType: "WEBSITE",
        }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ domain: expect.any(Object) }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({
        body: { hostname: "not a hostname", appType: "WEBSITE" },
      });
      const res = mockRes() as Response;

      await controller.addMyDomain(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.addDomain).not.toHaveBeenCalled();
    });

    it("returns 409 when hostname already registered", async () => {
      const err = Object.assign(new Error("Hostname already registered"), {
        statusCode: 409,
      });
      mockService.addDomain.mockRejectedValue(err);
      const req = makeReq({
        body: { hostname: "www.acme.com", appType: "WEBSITE" },
      });
      const res = mockRes() as Response;

      await controller.addMyDomain(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.addDomain.mockRejectedValue(new Error("DB down"));
      const req = makeReq({
        body: { hostname: "www.acme.com", appType: "WEBSITE" },
      });
      const res = mockRes() as Response;

      await controller.addMyDomain(req, res);
      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ============================================================
  // deleteMyDomain
  // ============================================================
  describe("deleteMyDomain", () => {
    it("returns 200 when domain belongs to tenant", async () => {
      mockService.listTenantDomains.mockResolvedValue([
        sampleDomain({ id: "d1" }),
      ]);
      mockService.deleteDomain.mockResolvedValue(undefined);
      const req = makeReq({ params: { domainId: "d1" } });
      const res = mockRes() as Response;

      await controller.deleteMyDomain(req, res);

      expect(mockService.deleteDomain).toHaveBeenCalledWith("d1");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when domain does not belong to tenant", async () => {
      mockService.listTenantDomains.mockResolvedValue([]);
      const req = makeReq({ params: { domainId: "other-tenant-domain" } });
      const res = mockRes() as Response;

      await controller.deleteMyDomain(req, res);

      expect(mockService.deleteDomain).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.listTenantDomains.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ params: { domainId: "d1" } });
      const res = mockRes() as Response;

      await controller.deleteMyDomain(req, res);
      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  // ============================================================
  // getMyDomainVerification
  // ============================================================
  describe("getMyDomainVerification", () => {
    it("returns 200 with verification instructions when domain belongs to tenant", async () => {
      mockService.listTenantDomains.mockResolvedValue([
        sampleDomain({ id: "d1" }),
      ]);
      mockService.getVerificationInstructions.mockResolvedValue({
        hostname: "www.acme.com",
        txtName: "_shaman.www.acme.com",
        txtValue: "shaman-verify=tok",
        verifiedAt: null,
      });
      const req = makeReq({ params: { domainId: "d1" } });
      const res = mockRes() as Response;

      await controller.getMyDomainVerification(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          txtName: "_shaman.www.acme.com",
          txtValue: "shaman-verify=tok",
        }),
      );
    });

    it("returns 404 when domain does not belong to tenant", async () => {
      mockService.listTenantDomains.mockResolvedValue([]);
      const req = makeReq({ params: { domainId: "d1" } });
      const res = mockRes() as Response;

      await controller.getMyDomainVerification(req, res);

      expect(mockService.getVerificationInstructions).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ============================================================
  // verifyMyDomain
  // ============================================================
  describe("verifyMyDomain", () => {
    it("returns 200 on successful verification when domain belongs to tenant", async () => {
      mockService.listTenantDomains.mockResolvedValue([
        sampleDomain({ id: "d1" }),
      ]);
      mockService.verifyDomain.mockResolvedValue(
        sampleDomain({ verifiedAt: new Date() }),
      );
      const req = makeReq({ params: { domainId: "d1" } });
      const res = mockRes() as Response;

      await controller.verifyMyDomain(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ domain: expect.any(Object) }),
      );
    });

    it("returns 404 when domain does not belong to tenant", async () => {
      mockService.listTenantDomains.mockResolvedValue([]);
      const req = makeReq({ params: { domainId: "d1" } });
      const res = mockRes() as Response;

      await controller.verifyMyDomain(req, res);

      expect(mockService.verifyDomain).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when TXT record missing", async () => {
      mockService.listTenantDomains.mockResolvedValue([
        sampleDomain({ id: "d1" }),
      ]);
      const err = Object.assign(new Error("TXT record missing"), {
        statusCode: 400,
      });
      mockService.verifyDomain.mockRejectedValue(err);
      const req = makeReq({ params: { domainId: "d1" } });
      const res = mockRes() as Response;

      await controller.verifyMyDomain(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.listTenantDomains.mockResolvedValue([
        sampleDomain({ id: "d1" }),
      ]);
      mockService.verifyDomain.mockRejectedValue(new Error("net broke"));
      const req = makeReq({ params: { domainId: "d1" } });
      const res = mockRes() as Response;

      await controller.verifyMyDomain(req, res);
      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
