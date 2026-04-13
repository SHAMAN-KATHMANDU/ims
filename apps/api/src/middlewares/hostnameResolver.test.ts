import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

const mockFindUnique = vi.fn();

vi.mock("@/config/prisma", () => ({
  basePrisma: {
    tenantDomain: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

vi.mock("@/config/tenantContext", () => ({
  runWithTenant: (_id: string, fn: () => unknown) => fn(),
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn((_req: Request, res: Response) =>
    res.status(500).json({ message: "error" }),
  ),
}));

import {
  resolveTenantFromHostname,
  clearHostnameCache,
} from "./hostnameResolver";

function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function tenantDomain(overrides: Record<string, unknown> = {}) {
  return {
    id: "d1",
    tenantId: "t1",
    hostname: "www.acme.com",
    appType: "WEBSITE",
    tenant: {
      id: "t1",
      name: "Acme",
      slug: "acme",
      isActive: true,
    },
    ...overrides,
  };
}

describe("resolveTenantFromHostname", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearHostnameCache();
  });

  it("attaches tenant + appType and calls next when hostname is registered", async () => {
    mockFindUnique.mockResolvedValue(tenantDomain());
    const mw = resolveTenantFromHostname();
    const req = { hostname: "www.acme.com" } as Request;
    const res = mockRes() as Response;
    const next = vi.fn();

    await mw(req, res, next);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { hostname: "www.acme.com" },
      include: { tenant: true },
    });
    expect(req.tenant?.id).toBe("t1");
    expect(req.appType).toBe("WEBSITE");
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("lowercases the incoming hostname", async () => {
    mockFindUnique.mockResolvedValue(tenantDomain());
    const mw = resolveTenantFromHostname();
    const req = { hostname: "WWW.Acme.COM" } as Request;
    const res = mockRes() as Response;
    const next = vi.fn();

    await mw(req, res, next);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { hostname: "www.acme.com" },
      include: { tenant: true },
    });
    expect(next).toHaveBeenCalled();
  });

  it("returns 404 when hostname is not registered (required=true)", async () => {
    mockFindUnique.mockResolvedValue(null);
    const mw = resolveTenantFromHostname();
    const req = { hostname: "unknown.example" } as Request;
    const res = mockRes() as Response;
    const next = vi.fn();

    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it("passes through when hostname unknown and required=false", async () => {
    mockFindUnique.mockResolvedValue(null);
    const mw = resolveTenantFromHostname({ required: false });
    const req = { hostname: "unknown.example" } as Request;
    const res = mockRes() as Response;
    const next = vi.fn();

    await mw(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.tenant).toBeUndefined();
  });

  it("returns 403 when tenant is inactive", async () => {
    mockFindUnique.mockResolvedValue(
      tenantDomain({
        tenant: { id: "t1", name: "Acme", slug: "acme", isActive: false },
      }),
    );
    const mw = resolveTenantFromHostname();
    const req = { hostname: "www.acme.com" } as Request;
    const res = mockRes() as Response;
    const next = vi.fn();

    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 when Host header is missing and required=true", async () => {
    const mw = resolveTenantFromHostname();
    const req = { hostname: "" } as Request;
    const res = mockRes() as Response;
    const next = vi.fn();

    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("caches hostname lookups within the TTL window", async () => {
    mockFindUnique.mockResolvedValue(tenantDomain());
    const mw = resolveTenantFromHostname();
    const req1 = { hostname: "www.acme.com" } as Request;
    const req2 = { hostname: "www.acme.com" } as Request;
    const res = mockRes() as Response;

    await mw(req1, res, vi.fn());
    await mw(req2, res, vi.fn());

    expect(mockFindUnique).toHaveBeenCalledTimes(1);
  });

  it("caches negative lookups too", async () => {
    mockFindUnique.mockResolvedValue(null);
    const mw = resolveTenantFromHostname({ required: false });
    const res = mockRes() as Response;

    await mw({ hostname: "nope.example" } as Request, res, vi.fn());
    await mw({ hostname: "nope.example" } as Request, res, vi.fn());

    expect(mockFindUnique).toHaveBeenCalledTimes(1);
  });

  it("clearHostnameCache invalidates cached entries", async () => {
    mockFindUnique.mockResolvedValue(tenantDomain());
    const mw = resolveTenantFromHostname();
    const res = mockRes() as Response;

    await mw({ hostname: "www.acme.com" } as Request, res, vi.fn());
    clearHostnameCache();
    await mw({ hostname: "www.acme.com" } as Request, res, vi.fn());

    expect(mockFindUnique).toHaveBeenCalledTimes(2);
  });
});
