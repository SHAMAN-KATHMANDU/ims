import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { mockRes, makeReq } from "@tests/helpers/controller";

// vi.mock is hoisted; use lazy `default: { ... }` factory pattern.
vi.mock("./public-api-keys.service", () => ({
  PublicApiKeysService: vi.fn(),
  default: {
    issue: vi.fn(),
    list: vi.fn(),
    rotate: vi.fn(),
    revoke: vi.fn(),
    toView: vi.fn((row) => ({
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      last4: row.last4,
      rateLimitPerMin: row.rateLimitPerMin ?? 120,
      allowedDomain: {
        id: row.tenantDomainId,
        hostname: row.tenantDomain?.hostname ?? "shop.acme.com",
        verifiedAt: row.tenantDomain?.verifiedAt ?? null,
      },
      createdAt: row.createdAt ?? new Date(),
      lastUsedAt: row.lastUsedAt ?? null,
      revokedAt: row.revokedAt ?? null,
    })),
  },
}));

vi.mock("@/modules/audit/audit.repository", () => ({
  default: { create: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn((_req, res) =>
    res.status(500).json({ success: false, message: "boom" }),
  ),
}));

vi.mock("@/config/prisma", () => ({ default: {}, basePrisma: {} }));

import controller from "./public-api-keys.controller";
import * as serviceModule from "./public-api-keys.service";

const mockService = serviceModule.default as unknown as Record<
  string,
  ReturnType<typeof vi.fn>
>;

const tenantDomain = {
  id: "domain-1",
  hostname: "shop.acme.com",
  verifiedAt: new Date(),
};

const fakeRecord = {
  id: "key-1",
  tenantId: "t1",
  tenantDomainId: "domain-1",
  name: "Acme",
  prefix: "pk_live_aabbccdd",
  hash: "$2a$12$...",
  last4: "abcd",
  rateLimitPerMin: 120,
  createdAt: new Date(),
  lastUsedAt: null,
  revokedAt: null,
  tenantDomain,
};

describe("PublicApiKeysController.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 201 with the full key string and view (without hash)", async () => {
    mockService.issue.mockResolvedValue({
      key: "pk_live_aabbccdd_" + "0".repeat(32),
      record: fakeRecord,
    });
    const req = makeReq({
      body: {
        name: "Acme",
        tenantDomainId: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
    const res = mockRes() as Response;

    await controller.create(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          key: expect.stringMatching(/^pk_live_/),
          apiKey: expect.objectContaining({
            id: "key-1",
            prefix: "pk_live_aabbccdd",
            last4: "abcd",
            allowedDomain: expect.objectContaining({
              hostname: "shop.acme.com",
            }),
          }),
        }),
      }),
    );
    // Hash must never be returned.
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toContain("$2a$");
  });

  it("returns 400 on Zod validation failure", async () => {
    const req = makeReq({ body: { name: "", tenantDomainId: "not-uuid" } });
    const res = mockRes() as Response;
    await controller.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("propagates AppError statusCode (e.g. 400 unverified domain)", async () => {
    mockService.issue.mockRejectedValue(
      Object.assign(new Error("Domain not verified"), { statusCode: 400 }),
    );
    const req = makeReq({
      body: {
        name: "Acme",
        tenantDomainId: "550e8400-e29b-41d4-a716-446655440000",
      },
    });
    const res = mockRes() as Response;
    await controller.create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("PublicApiKeysController.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with list (no secrets)", async () => {
    mockService.list.mockResolvedValue([
      {
        id: "k1",
        prefix: "pk_live_aabbccdd",
        last4: "abcd",
        name: "Acme",
        rateLimitPerMin: 120,
        allowedDomain: {
          id: "d1",
          hostname: "shop.acme.com",
          verifiedAt: new Date(),
        },
        createdAt: new Date(),
        lastUsedAt: null,
        revokedAt: null,
      },
    ]);
    const req = makeReq();
    const res = mockRes() as Response;
    await controller.list(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toMatch(/hash|\$2a\$/);
  });
});

describe("PublicApiKeysController.revoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with the revoked id", async () => {
    mockService.revoke.mockResolvedValue({ id: "k1", revokedAt: new Date() });
    const req = makeReq({
      params: { id: "k1" },
    } as unknown as Partial<Request>);
    const res = mockRes() as Response;
    await controller.revoke(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("404s when service throws 404", async () => {
    mockService.revoke.mockRejectedValue(
      Object.assign(new Error("not found"), { statusCode: 404 }),
    );
    const req = makeReq({
      params: { id: "k1" },
    } as unknown as Partial<Request>);
    const res = mockRes() as Response;
    await controller.revoke(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("PublicApiKeysController.rotate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with new key and revokedId", async () => {
    mockService.rotate.mockResolvedValue({
      revokedId: "k1",
      issued: {
        key: "pk_live_aabbccdd_" + "0".repeat(32),
        record: { ...fakeRecord, id: "k2" },
      },
    });
    const req = makeReq({
      params: { id: "k1" },
    } as unknown as Partial<Request>);
    const res = mockRes() as Response;
    await controller.rotate(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          revokedId: "k1",
          key: expect.stringMatching(/^pk_live_/),
        }),
      }),
    );
  });
});
