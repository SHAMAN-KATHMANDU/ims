import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./platform-domains.service", () => ({
  default: {
    listTenantDomains: vi.fn(),
    addDomain: vi.fn(),
    updateDomain: vi.fn(),
    deleteDomain: vi.fn(),
    getVerificationInstructions: vi.fn(),
    verifyDomain: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./platform-domains.controller";
import * as serviceModule from "./platform-domains.service";
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

describe("PlatformDomainsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listTenantDomains", () => {
    it("returns 200 with domains on success", async () => {
      mockService.listTenantDomains.mockResolvedValue([sampleDomain()]);
      const req = makeReq({ params: { tenantId: "t1" } });
      const res = mockRes() as Response;

      await controller.listTenantDomains(req, res);

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
      const req = makeReq({
        params: { tenantId: "t1" },
        query: { appType: "IMS" },
      });
      const res = mockRes() as Response;

      await controller.listTenantDomains(req, res);
      expect(mockService.listTenantDomains).toHaveBeenCalledWith("t1", "IMS");
    });

    it("returns 404 when service throws statusCode 404", async () => {
      const err = Object.assign(new Error("Tenant not found"), {
        statusCode: 404,
      });
      mockService.listTenantDomains.mockRejectedValue(err);
      const req = makeReq({ params: { tenantId: "missing" } });
      const res = mockRes() as Response;

      await controller.listTenantDomains(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("falls back to sendControllerError on unexpected error", async () => {
      mockService.listTenantDomains.mockRejectedValue(new Error("DB down"));
      const req = makeReq({ params: { tenantId: "t1" } });
      const res = mockRes() as Response;

      await controller.listTenantDomains(req, res);
      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("createTenantDomain", () => {
    it("returns 201 with created domain on success", async () => {
      mockService.addDomain.mockResolvedValue(sampleDomain());
      const req = makeReq({
        params: { tenantId: "t1" },
        body: { hostname: "www.acme.com", appType: "WEBSITE" },
      });
      const res = mockRes() as Response;

      await controller.createTenantDomain(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ domain: expect.any(Object) }),
      );
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({
        params: { tenantId: "t1" },
        body: { hostname: "not a hostname", appType: "WEBSITE" },
      });
      const res = mockRes() as Response;

      await controller.createTenantDomain(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockService.addDomain).not.toHaveBeenCalled();
    });

    it("returns 409 when hostname already registered", async () => {
      const err = Object.assign(new Error("Hostname already registered"), {
        statusCode: 409,
      });
      mockService.addDomain.mockRejectedValue(err);
      const req = makeReq({
        params: { tenantId: "t1" },
        body: { hostname: "www.acme.com", appType: "WEBSITE" },
      });
      const res = mockRes() as Response;

      await controller.createTenantDomain(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 404 when tenant is missing", async () => {
      const err = Object.assign(new Error("Tenant not found"), {
        statusCode: 404,
      });
      mockService.addDomain.mockRejectedValue(err);
      const req = makeReq({
        params: { tenantId: "missing" },
        body: { hostname: "www.acme.com", appType: "WEBSITE" },
      });
      const res = mockRes() as Response;

      await controller.createTenantDomain(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("updateDomain", () => {
    it("returns 200 on success", async () => {
      mockService.updateDomain.mockResolvedValue(
        sampleDomain({ isPrimary: true }),
      );
      const req = makeReq({
        params: { id: "d1" },
        body: { isPrimary: true },
      });
      const res = mockRes() as Response;

      await controller.updateDomain(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockService.updateDomain).toHaveBeenCalledWith("d1", {
        isPrimary: true,
      });
    });

    it("returns 400 on invalid body", async () => {
      const req = makeReq({
        params: { id: "d1" },
        body: { appType: "BAD" },
      });
      const res = mockRes() as Response;

      await controller.updateDomain(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("deleteDomain", () => {
    it("returns 200 on success", async () => {
      mockService.deleteDomain.mockResolvedValue(undefined);
      const req = makeReq({ params: { id: "d1" } });
      const res = mockRes() as Response;

      await controller.deleteDomain(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockService.deleteDomain).toHaveBeenCalledWith("d1");
    });

    it("returns 404 when domain missing", async () => {
      const err = Object.assign(new Error("Domain not found"), {
        statusCode: 404,
      });
      mockService.deleteDomain.mockRejectedValue(err);
      const req = makeReq({ params: { id: "missing" } });
      const res = mockRes() as Response;

      await controller.deleteDomain(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("getVerificationInstructions", () => {
    it("returns 200 with TXT name and value", async () => {
      mockService.getVerificationInstructions.mockResolvedValue({
        hostname: "www.acme.com",
        txtName: "_shaman.www.acme.com",
        txtValue: "shaman-verify=tok",
        verifiedAt: null,
      });
      const req = makeReq({ params: { id: "d1" } });
      const res = mockRes() as Response;

      await controller.getVerificationInstructions(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          txtName: "_shaman.www.acme.com",
          txtValue: "shaman-verify=tok",
        }),
      );
    });
  });

  describe("verifyDomain", () => {
    it("returns 200 on successful verification", async () => {
      mockService.verifyDomain.mockResolvedValue(
        sampleDomain({ verifiedAt: new Date() }),
      );
      const req = makeReq({ params: { id: "d1" } });
      const res = mockRes() as Response;

      await controller.verifyDomain(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 when TXT record missing or mismatched", async () => {
      const err = Object.assign(new Error("TXT record missing"), {
        statusCode: 400,
      });
      mockService.verifyDomain.mockRejectedValue(err);
      const req = makeReq({ params: { id: "d1" } });
      const res = mockRes() as Response;

      await controller.verifyDomain(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("falls back to sendControllerError on unexpected failure", async () => {
      mockService.verifyDomain.mockRejectedValue(new Error("net broke"));
      const req = makeReq({ params: { id: "d1" } });
      const res = mockRes() as Response;

      await controller.verifyDomain(req, res);
      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
