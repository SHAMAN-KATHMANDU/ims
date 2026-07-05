import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";

vi.mock("@/config/env", () => ({
  env: {
    oauthIssuerUrl: "https://api.test",
    webPublicUrl: "https://app.test",
    mcpOauthAccessTokenTtl: "1h",
    mcpOauthRefreshTokenTtl: "30d",
  },
}));

vi.mock("@/config/prisma", () => ({
  default: {},
  basePrisma: {
    oAuthClient: { findUnique: vi.fn(), create: vi.fn() },
    oAuthAuthorizationRequest: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    oAuthRefreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    mcpToken: { findUnique: vi.fn(), updateMany: vi.fn() },
    user: { findFirst: vi.fn() },
    tenant: { findUnique: vi.fn() },
  },
}));

vi.mock("@/utils/encryption", () => ({
  encrypt: vi.fn((v: string) => `enc(${v})`),
  decrypt: vi.fn((v: string) => v.replace(/^enc\(|\)$/g, "")),
}));

vi.mock("@/modules/mcp/mcp.token", () => ({
  signMcpToken: vi.fn(),
  verifyMcpToken: vi.fn(),
}));

vi.mock("@/config/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { basePrisma } from "@/config/prisma";
import { signMcpToken } from "@/modules/mcp/mcp.token";
import {
  oauthServerProvider,
  parseDurationMs,
  MCP_RESOURCE_URL,
} from "./oauth.provider";

const prismaMock = basePrisma as unknown as {
  oAuthClient: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  oAuthAuthorizationRequest: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  oAuthRefreshToken: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  mcpToken: {
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  user: { findFirst: ReturnType<typeof vi.fn> };
  tenant: { findUnique: ReturnType<typeof vi.fn> };
};

const clientInfo = {
  client_id: "client-abc",
  redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
} as never;

const clientRow = {
  id: "row-1",
  clientId: "client-abc",
  clientSecret: null,
  clientName: "Claude",
  redirectUris: ["https://claude.ai/api/mcp/auth_callback"],
  grantTypes: ["authorization_code", "refresh_token"],
  tokenEndpointAuthMethod: "none",
  scope: "mcp",
  createdAt: new Date("2026-01-01"),
  revokedAt: null,
};

function approvedRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-1",
    clientId: "row-1",
    redirectUri: "https://claude.ai/api/mcp/auth_callback",
    state: "xyz",
    scope: "mcp",
    resource: null,
    codeChallenge: "challenge",
    code: "code-1",
    codeUsedAt: null,
    tenantId: "t1",
    userId: "u1",
    approvedAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    client: clientRow,
    ...overrides,
  };
}

function primeHappyIssue() {
  prismaMock.user.findFirst.mockResolvedValue({
    id: "u1",
    role: "admin",
    username: "roshan",
  });
  prismaMock.tenant.findUnique.mockResolvedValue({
    slug: "demo",
    isActive: true,
  });
  vi.mocked(signMcpToken).mockResolvedValue({
    id: "mcp-1",
    token: "jwt-token",
    jti: "jti-1",
    expiresIn: "1h",
    expiresAt: new Date(Date.now() + 3_600_000),
  });
  prismaMock.oAuthRefreshToken.create.mockResolvedValue({});
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.oAuthAuthorizationRequest.deleteMany.mockResolvedValue({
    count: 0,
  });
});

describe("parseDurationMs", () => {
  it("parses s/m/h/d suffixes", () => {
    expect(parseDurationMs("45s")).toBe(45_000);
    expect(parseDurationMs("15m")).toBe(900_000);
    expect(parseDurationMs("1h")).toBe(3_600_000);
    expect(parseDurationMs("30d")).toBe(2_592_000_000);
  });

  it("rejects malformed durations", () => {
    expect(() => parseDurationMs("soon")).toThrow();
    expect(() => parseDurationMs("10w")).toThrow();
  });
});

describe("MCP_RESOURCE_URL", () => {
  it("is derived from the issuer origin", () => {
    expect(MCP_RESOURCE_URL).toBe("https://api.test/api/v1/mcp");
  });
});

describe("clientsStore.registerClient", () => {
  it("rejects non-https redirect uris (except loopback)", async () => {
    await expect(
      oauthServerProvider.clientsStore.registerClient!({
        client_id: "c1",
        redirect_uris: ["http://evil.example.com/cb"],
      } as never),
    ).rejects.toThrow(/https/);
  });

  it("allows http loopback redirect uris", async () => {
    prismaMock.oAuthClient.create.mockResolvedValue(clientRow);
    const result = await oauthServerProvider.clientsStore.registerClient!({
      client_id: "c1",
      redirect_uris: ["http://localhost:6274/oauth/callback"],
      token_endpoint_auth_method: "none",
    } as never);
    expect(result.client_id).toBe("c1");
    expect(prismaMock.oAuthClient.create).toHaveBeenCalled();
  });

  it("encrypts the client secret at rest and returns the plaintext", async () => {
    prismaMock.oAuthClient.create.mockResolvedValue(clientRow);
    const result = await oauthServerProvider.clientsStore.registerClient!({
      client_id: "c2",
      client_secret: "s3cret",
      redirect_uris: ["https://chatgpt.com/connector_platform_oauth_redirect"],
      token_endpoint_auth_method: "client_secret_post",
    } as never);
    expect(result.client_secret).toBe("s3cret");
    expect(
      prismaMock.oAuthClient.create.mock.calls[0]![0].data.clientSecret,
    ).toBe("enc(s3cret)");
  });
});

describe("authorize", () => {
  it("stores a pending request and redirects to the web consent page", async () => {
    prismaMock.oAuthClient.findUnique.mockResolvedValue(clientRow);
    prismaMock.oAuthAuthorizationRequest.create.mockResolvedValue({
      id: "req-9",
    });
    const res = { redirect: vi.fn() } as unknown as Response;

    await oauthServerProvider.authorize(
      clientInfo,
      {
        state: "abc",
        scopes: ["mcp"],
        codeChallenge: "chal",
        redirectUri: "https://claude.ai/api/mcp/auth_callback",
      },
      res,
    );

    const created =
      prismaMock.oAuthAuthorizationRequest.create.mock.calls[0]![0].data;
    expect(created.tenantId).toBeUndefined(); // tenant bound at consent, not here
    expect(created.codeChallenge).toBe("chal");
    expect(res.redirect).toHaveBeenCalledWith(
      302,
      "https://app.test/oauth/consent?request_id=req-9",
    );
  });

  it("rejects a foreign resource indicator", async () => {
    const res = { redirect: vi.fn() } as unknown as Response;
    await expect(
      oauthServerProvider.authorize(
        clientInfo,
        {
          scopes: [],
          codeChallenge: "chal",
          redirectUri: "https://claude.ai/api/mcp/auth_callback",
          resource: new URL("https://other-api.example.com/mcp"),
        },
        res,
      ),
    ).rejects.toThrow(/resource/i);
    expect(res.redirect).not.toHaveBeenCalled();
  });
});

describe("exchangeAuthorizationCode", () => {
  it("issues access + refresh tokens for an approved code", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      approvedRequest(),
    );
    prismaMock.oAuthAuthorizationRequest.updateMany.mockResolvedValue({
      count: 1,
    });
    primeHappyIssue();

    const tokens = await oauthServerProvider.exchangeAuthorizationCode(
      clientInfo,
      "code-1",
    );

    expect(tokens.access_token).toBe("jwt-token");
    expect(tokens.refresh_token).toBeTruthy();
    expect(tokens.scope).toBe("mcp");
    // Access token is minted for the APPROVING user's tenant.
    expect(vi.mocked(signMcpToken).mock.calls[0]![0]).toMatchObject({
      id: "u1",
      tenantId: "t1",
      tenantSlug: "demo",
      oauthClientId: "row-1",
      ttl: "1h",
    });
  });

  it("rejects an unapproved (no tenant binding) code", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      approvedRequest({ approvedAt: null, tenantId: null, userId: null }),
    );
    await expect(
      oauthServerProvider.exchangeAuthorizationCode(clientInfo, "code-1"),
    ).rejects.toThrow(/invalid or expired/i);
  });

  it("rejects an expired code", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      approvedRequest({ expiresAt: new Date(Date.now() - 1000) }),
    );
    await expect(
      oauthServerProvider.exchangeAuthorizationCode(clientInfo, "code-1"),
    ).rejects.toThrow(/invalid or expired/i);
  });

  it("rejects a code issued to a different client", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      approvedRequest({ client: { ...clientRow, clientId: "someone-else" } }),
    );
    await expect(
      oauthServerProvider.exchangeAuthorizationCode(clientInfo, "code-1"),
    ).rejects.toThrow(/invalid or expired/i);
  });

  it("rejects a redirect_uri mismatch", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      approvedRequest(),
    );
    await expect(
      oauthServerProvider.exchangeAuthorizationCode(
        clientInfo,
        "code-1",
        undefined,
        "https://attacker.example.com/cb",
      ),
    ).rejects.toThrow(/redirect_uri/);
  });

  it("enforces single use — the second exchange loses the updateMany race", async () => {
    prismaMock.oAuthAuthorizationRequest.findUnique.mockResolvedValue(
      approvedRequest(),
    );
    prismaMock.oAuthAuthorizationRequest.updateMany.mockResolvedValue({
      count: 0,
    });
    await expect(
      oauthServerProvider.exchangeAuthorizationCode(clientInfo, "code-1"),
    ).rejects.toThrow(/already used/i);
    expect(signMcpToken).not.toHaveBeenCalled();
  });
});

describe("exchangeRefreshToken", () => {
  const refreshRow = {
    id: "rt-1",
    tokenHash: "hash",
    familyId: "fam-1",
    clientId: "row-1",
    tenantId: "t1",
    userId: "u1",
    scope: "mcp",
    expiresAt: new Date(Date.now() + 86_400_000),
    rotatedAt: null,
    revokedAt: null,
    createdAt: new Date(),
    client: clientRow,
  };

  it("rotates the token and issues a new pair", async () => {
    prismaMock.oAuthRefreshToken.findUnique.mockResolvedValue(refreshRow);
    prismaMock.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 1 });
    primeHappyIssue();

    const tokens = await oauthServerProvider.exchangeRefreshToken(
      clientInfo,
      "opaque-refresh",
    );

    expect(tokens.access_token).toBe("jwt-token");
    expect(tokens.refresh_token).toBeTruthy();
    // Successor stays in the same rotation family.
    expect(
      prismaMock.oAuthRefreshToken.create.mock.calls[0]![0].data.familyId,
    ).toBe("fam-1");
  });

  it("revokes the whole family when a rotated token is replayed", async () => {
    prismaMock.oAuthRefreshToken.findUnique.mockResolvedValue({
      ...refreshRow,
      rotatedAt: new Date(),
    });
    prismaMock.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 2 });

    await expect(
      oauthServerProvider.exchangeRefreshToken(clientInfo, "opaque-refresh"),
    ).rejects.toThrow(/no longer valid/i);

    expect(prismaMock.oAuthRefreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId: "fam-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("rejects an expired refresh token", async () => {
    prismaMock.oAuthRefreshToken.findUnique.mockResolvedValue({
      ...refreshRow,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      oauthServerProvider.exchangeRefreshToken(clientInfo, "opaque-refresh"),
    ).rejects.toThrow(/expired/i);
  });

  it("rejects a refresh token owned by a different client", async () => {
    prismaMock.oAuthRefreshToken.findUnique.mockResolvedValue({
      ...refreshRow,
      client: { ...clientRow, clientId: "someone-else" },
    });
    await expect(
      oauthServerProvider.exchangeRefreshToken(clientInfo, "opaque-refresh"),
    ).rejects.toThrow(/invalid refresh token/i);
  });

  it("refuses to issue tokens for a deactivated tenant", async () => {
    prismaMock.oAuthRefreshToken.findUnique.mockResolvedValue(refreshRow);
    prismaMock.oAuthRefreshToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.user.findFirst.mockResolvedValue({
      id: "u1",
      role: "admin",
      username: "roshan",
    });
    prismaMock.tenant.findUnique.mockResolvedValue({
      slug: "demo",
      isActive: false,
    });
    await expect(
      oauthServerProvider.exchangeRefreshToken(clientInfo, "opaque-refresh"),
    ).rejects.toThrow(/no longer valid/i);
  });
});
