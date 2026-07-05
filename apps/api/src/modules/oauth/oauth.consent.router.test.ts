import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("@/config/prisma", () => ({
  default: {},
  basePrisma: {
    oAuthAuthorizationRequest: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/middlewares/requirePermission", () => ({
  requirePermission: vi.fn(
    () => (_req: unknown, _res: unknown, next: () => void) => next(),
  ),
}));

vi.mock("@/shared/permissions/resourceLocator", () => ({
  workspaceLocator: vi.fn(() => ({})),
}));

vi.mock("@/shared/auth/getAuthContext", () => ({
  getAuthContext: vi.fn(() => ({
    tenantId: "tenant-A",
    userId: "user-A",
    role: "admin",
  })),
}));

vi.mock("@/config/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("./oauth.provider", () => ({
  CODE_TTL_MS: 60_000,
}));

import { basePrisma } from "@/config/prisma";
import oauthConsentRouter from "./oauth.consent.router";

const prismaMock = basePrisma as unknown as {
  oAuthAuthorizationRequest: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
};

function makeApp() {
  const app = express();
  app.use(express.json());
  // Simulate the authenticated user set by verifyToken.
  app.use((req, _res, next) => {
    (req as unknown as { user: { id: string } }).user = { id: "user-A" };
    next();
  });
  app.use("/oauth/consent", oauthConsentRouter);
  return app;
}

function pendingRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-1",
    clientId: "row-1",
    redirectUri: "https://claude.ai/api/mcp/auth_callback",
    state: "st4te",
    scope: "mcp",
    resource: null,
    codeChallenge: "chal",
    code: null,
    codeUsedAt: null,
    tenantId: null,
    userId: null,
    approvedAt: null,
    expiresAt: new Date(Date.now() + 5 * 60_000),
    createdAt: new Date(),
    client: { clientName: "Claude" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /oauth/consent/:requestId", () => {
  it("returns display info for a pending request", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      pendingRequest(),
    );
    const res = await request(makeApp()).get("/oauth/consent/req-1");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      clientName: "Claude",
      scope: "mcp",
      redirectHost: "claude.ai",
    });
  });

  it("404s on an unknown request", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(null);
    const res = await request(makeApp()).get("/oauth/consent/nope");
    expect(res.status).toBe(404);
  });

  it("410s on an expired request", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      pendingRequest({ expiresAt: new Date(Date.now() - 1000) }),
    );
    const res = await request(makeApp()).get("/oauth/consent/req-1");
    expect(res.status).toBe(410);
  });

  it("410s on an already-approved request", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      pendingRequest({ approvedAt: new Date() }),
    );
    const res = await request(makeApp()).get("/oauth/consent/req-1");
    expect(res.status).toBe(410);
  });
});

describe("POST /oauth/consent/:requestId/decision", () => {
  it("approve binds the APPROVING user's tenant and returns code redirect", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      pendingRequest(),
    );
    prismaMock.oAuthAuthorizationRequest.updateMany.mockResolvedValue({
      count: 1,
    });

    const res = await request(makeApp())
      .post("/oauth/consent/req-1/decision")
      .send({ approved: true });

    expect(res.status).toBe(200);
    const redirect = new URL(res.body.data.redirectTo);
    expect(redirect.origin + redirect.pathname).toBe(
      "https://claude.ai/api/mcp/auth_callback",
    );
    expect(redirect.searchParams.get("code")).toBeTruthy();
    expect(redirect.searchParams.get("state")).toBe("st4te");

    const update =
      prismaMock.oAuthAuthorizationRequest.updateMany.mock.calls[0]![0];
    expect(update.where).toMatchObject({ approvedAt: null, codeUsedAt: null });
    expect(update.data).toMatchObject({
      tenantId: "tenant-A",
      userId: "user-A",
    });
  });

  it("deny burns the request and returns access_denied redirect", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      pendingRequest(),
    );
    prismaMock.oAuthAuthorizationRequest.update.mockResolvedValue({});

    const res = await request(makeApp())
      .post("/oauth/consent/req-1/decision")
      .send({ approved: false });

    expect(res.status).toBe(200);
    const redirect = new URL(res.body.data.redirectTo);
    expect(redirect.searchParams.get("error")).toBe("access_denied");
    expect(redirect.searchParams.get("state")).toBe("st4te");
    // Request must be unusable afterwards.
    expect(prismaMock.oAuthAuthorizationRequest.update).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { expiresAt: expect.any(Date) },
    });
  });

  it("410s when two approvals race (updateMany count 0)", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      pendingRequest(),
    );
    prismaMock.oAuthAuthorizationRequest.updateMany.mockResolvedValue({
      count: 0,
    });
    const res = await request(makeApp())
      .post("/oauth/consent/req-1/decision")
      .send({ approved: true });
    expect(res.status).toBe(410);
  });

  it("400s on a malformed body", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      pendingRequest(),
    );
    const res = await request(makeApp())
      .post("/oauth/consent/req-1/decision")
      .send({ approved: "yes" });
    expect(res.status).toBe(400);
  });
});
