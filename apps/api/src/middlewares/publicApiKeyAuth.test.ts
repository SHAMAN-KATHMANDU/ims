import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("@/config/prisma", () => ({
  default: {},
  basePrisma: { tenant: { findUnique: vi.fn() } },
}));
vi.mock("@/config/tenantContext", () => ({
  runWithTenant: (_id: string, fn: () => unknown) => fn(),
}));
vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn((_req, res) =>
    res.status(500).json({ message: "boom" }),
  ),
}));

import { publicApiKeyAuth } from "./publicApiKeyAuth";
import type { PublicApiKeysService } from "@/modules/public-api-keys/public-api-keys.service";
import type { PublicApiKeysRepository } from "@/modules/public-api-keys/public-api-keys.repository";

function mockRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as unknown as Request;
}

const tenant = {
  id: "t1",
  isActive: true,
} as const;

const tenantDomain = {
  id: "d1",
  hostname: "shop.acme.com",
  verifiedAt: new Date(),
} as const;

const goodKey = `pk_live_${"a".repeat(8)}_${"b".repeat(32)}`;

function makeMocks(opts: { verifyResult: unknown; tenant: unknown }) {
  const service = {
    verifyKey: vi.fn().mockResolvedValue(opts.verifyResult),
  } as unknown as PublicApiKeysService;
  const repo = {
    touchLastUsed: vi.fn(),
  } as unknown as PublicApiKeysRepository;
  const loadTenant = vi.fn().mockResolvedValue(opts.tenant);
  return { service, repo, loadTenant };
}

describe("publicApiKeyAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401s when Authorization header is missing", async () => {
    const { service, repo, loadTenant } = makeMocks({
      verifyResult: null,
      tenant: null,
    });
    const mw = publicApiKeyAuth({ service, repo, loadTenant });
    const req = makeReq({ headers: {} });
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401s when header is malformed (no Bearer)", async () => {
    const { service, repo, loadTenant } = makeMocks({
      verifyResult: null,
      tenant: null,
    });
    const mw = publicApiKeyAuth({ service, repo, loadTenant });
    const req = makeReq({ headers: { authorization: goodKey } });
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("401s when service.verifyKey returns null (any failure mode)", async () => {
    const { service, repo, loadTenant } = makeMocks({
      verifyResult: null,
      tenant: null,
    });
    const mw = publicApiKeyAuth({ service, repo, loadTenant });
    const req = makeReq({
      headers: { authorization: `Bearer ${goodKey}` },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401s when tenant is inactive", async () => {
    const { service, repo, loadTenant } = makeMocks({
      verifyResult: { id: "k1", tenantId: "t1", tenantDomain },
      tenant: { ...tenant, isActive: false },
    });
    const mw = publicApiKeyAuth({ service, repo, loadTenant });
    const req = makeReq({
      headers: { authorization: `Bearer ${goodKey}` },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("attaches req.tenant + req.apiKey + req.appType and calls next()", async () => {
    const record = { id: "k1", tenantId: "t1", tenantDomain };
    const { service, repo, loadTenant } = makeMocks({
      verifyResult: record,
      tenant,
    });
    const mw = publicApiKeyAuth({ service, repo, loadTenant });
    const req = makeReq({
      headers: { authorization: `Bearer ${goodKey}` },
    });
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    await mw(req, res, next);
    expect(req.tenant).toEqual(tenant);
    expect(req.apiKey).toEqual(record);
    expect(req.appType).toBe("API");
    expect(repo.touchLastUsed).toHaveBeenCalledWith("k1");
    expect(next).toHaveBeenCalled();
  });
});
