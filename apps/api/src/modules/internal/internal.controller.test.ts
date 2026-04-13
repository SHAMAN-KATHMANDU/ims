import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

vi.mock("./internal.service", () => ({
  default: {
    isDomainAllowedForTls: vi.fn(),
    resolveHost: vi.fn(),
  },
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));
vi.mock("@/config/prisma", () => ({ default: {} }));

import controller from "./internal.controller";
import * as serviceModule from "./internal.service";

const mockService = serviceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

function mockRes(): Partial<Response> {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

function makeReq(query: Record<string, string> = {}): Request {
  return { query } as unknown as Request;
}

describe("InternalController.domainAllowed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when service allows", async () => {
    mockService.isDomainAllowedForTls.mockResolvedValue({
      allowed: true,
      tenantId: "t1",
      hostname: "www.acme.com",
      appType: "WEBSITE",
    });
    const req = makeReq({ domain: "www.acme.com" });
    const res = mockRes() as Response;

    await controller.domainAllowed(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ allowed: true, tenantId: "t1" }),
    );
  });

  it("returns 403 when service denies, passing reason through", async () => {
    mockService.isDomainAllowedForTls.mockResolvedValue({
      allowed: false,
      reason: "not_verified",
    });
    const req = makeReq({ domain: "www.acme.com" });
    const res = mockRes() as Response;

    await controller.domainAllowed(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ allowed: false, reason: "not_verified" }),
    );
  });

  it("returns 400 when domain query param is missing", async () => {
    const req = makeReq({});
    const res = mockRes() as Response;

    await controller.domainAllowed(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockService.isDomainAllowedForTls).not.toHaveBeenCalled();
  });

  it("returns 400 when domain is not a valid hostname", async () => {
    const req = makeReq({ domain: "not a hostname" });
    const res = mockRes() as Response;

    await controller.domainAllowed(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("InternalController.resolveHost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 when host resolves", async () => {
    mockService.resolveHost.mockResolvedValue({
      resolved: true,
      tenantId: "t1",
      tenantSlug: "acme",
      hostname: "www.acme.com",
      appType: "WEBSITE",
      websiteEnabled: true,
      isPublished: true,
      templateSlug: null,
    });
    const req = makeReq({ host: "www.acme.com" });
    const res = mockRes() as Response;

    await controller.resolveHost(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        resolved: true,
        tenantId: "t1",
        tenantSlug: "acme",
      }),
    );
  });

  it("returns 404 when host is unknown", async () => {
    mockService.resolveHost.mockResolvedValue({
      resolved: false,
      reason: "unknown_host",
    });
    const req = makeReq({ host: "unknown.example" });
    const res = mockRes() as Response;

    await controller.resolveHost(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ resolved: false, reason: "unknown_host" }),
    );
  });

  it("returns 400 on invalid host", async () => {
    const req = makeReq({ host: "" });
    const res = mockRes() as Response;

    await controller.resolveHost(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
