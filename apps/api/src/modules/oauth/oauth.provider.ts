/**
 * Prisma-backed OAuthServerProvider for the MCP SDK's mcpAuthRouter.
 *
 * The SDK router owns the OAuth 2.1 protocol surface (/.well-known metadata,
 * /authorize, /token, /register, /revoke, PKCE S256 verification, rate
 * limiting); this provider supplies storage + policy:
 *
 * - Clients are GLOBAL, not tenant-scoped — dynamic client registration
 *   (RFC 7591) is anonymous. Tenant/user binding happens at consent time
 *   (oauth.consent.router.ts), which stamps tenantId/userId onto the pending
 *   OAuthAuthorizationRequest before a code can be exchanged.
 * - Access tokens ARE McpTokens: /token issues the same aud="ims-mcp" JWT
 *   (signMcpToken) with a short TTL, so verifyMcpToken / mcp.middleware and
 *   jti-row revocation work identically for static and OAuth tokens.
 * - Refresh tokens are opaque (sha256 hash at rest) and rotate per use;
 *   reuse of a rotated token revokes the whole family.
 * - Client secrets are AES-256-GCM encrypted at rest (utils/encryption); the
 *   SDK's clientAuth middleware compares plaintext, so getClient decrypts.
 */

import { createHash, randomBytes, randomUUID } from "crypto";
import { Response } from "express";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  InvalidClientMetadataError,
  InvalidGrantError,
  InvalidTargetError,
  InvalidTokenError,
  ServerError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { OAuthClient } from "@prisma/client";
import { basePrisma } from "@/config/prisma";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { encrypt, decrypt } from "@/utils/encryption";
import { signMcpToken, verifyMcpToken } from "@/modules/mcp/mcp.token";

export const MCP_RESOURCE_URL = `${env.oauthIssuerUrl}/api/v1/mcp`;
export const MCP_SCOPE = "mcp";

/** How long a pending /authorize request may wait for consent. */
const AUTH_REQUEST_TTL_MS = 10 * 60 * 1000;
/** How long an issued authorization code stays exchangeable. */
export const CODE_TTL_MS = 60 * 1000;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** "45s" / "15m" / "1h" / "30d" → milliseconds. */
export function parseDurationMs(ttl: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(ttl.trim());
  if (!match) {
    throw new Error(
      `Invalid duration "${ttl}" — expected e.g. "15m", "1h", "30d"`,
    );
  }
  const value = parseInt(match[1]!, 10);
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
    match[2] as "s" | "m" | "h" | "d"
  ];
  return value * unit;
}

function normalizeResource(url: string): string {
  return url.replace(/\/+$/, "");
}

/** RFC 8707: a requested resource must be the canonical MCP endpoint. */
function assertResourceAllowed(resource: URL | undefined): void {
  if (!resource) return;
  if (
    normalizeResource(resource.href) !== normalizeResource(MCP_RESOURCE_URL)
  ) {
    throw new InvalidTargetError(
      `Unknown resource. This server only issues tokens for ${MCP_RESOURCE_URL}`,
    );
  }
}

function toClientInfo(row: OAuthClient): OAuthClientInformationFull {
  return {
    client_id: row.clientId,
    client_secret: row.clientSecret ? decrypt(row.clientSecret) : undefined,
    client_name: row.clientName ?? undefined,
    redirect_uris: row.redirectUris,
    grant_types: row.grantTypes,
    token_endpoint_auth_method: row.tokenEndpointAuthMethod,
    scope: row.scope,
    client_id_issued_at: Math.floor(row.createdAt.getTime() / 1000),
  };
}

async function requireClientRow(clientId: string): Promise<OAuthClient> {
  const row = await basePrisma.oAuthClient.findUnique({
    where: { clientId },
  });
  if (!row || row.revokedAt) {
    throw new InvalidGrantError("Unknown client");
  }
  return row;
}

/**
 * Mint the aud="ims-mcp" access token for an approved grant. Role/username
 * are read fresh from the user row so role changes propagate on refresh.
 */
async function issueAccessToken(
  userId: string,
  tenantId: string,
  clientRow: OAuthClient,
): Promise<{ token: string; expiresInSeconds: number }> {
  const user = await basePrisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    select: { id: true, role: true, username: true },
  });
  const tenant = await basePrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true, isActive: true },
  });
  if (!user || !tenant || !tenant.isActive) {
    throw new InvalidGrantError("Grant no longer valid");
  }

  const issued = await signMcpToken({
    id: user.id,
    role: user.role,
    tenantId,
    tenantSlug: tenant.slug,
    username: user.username,
    name: `${clientRow.clientName ?? "OAuth client"} (OAuth)`,
    ttl: env.mcpOauthAccessTokenTtl,
    oauthClientId: clientRow.id,
  });

  const expiresInSeconds = Math.max(
    1,
    Math.floor((issued.expiresAt.getTime() - Date.now()) / 1000),
  );
  return { token: issued.token, expiresInSeconds };
}

async function createRefreshToken(
  clientRow: OAuthClient,
  tenantId: string,
  userId: string,
  familyId: string,
): Promise<string> {
  const refreshToken = randomBytes(32).toString("base64url");
  await basePrisma.oAuthRefreshToken.create({
    data: {
      tokenHash: sha256(refreshToken),
      familyId,
      clientId: clientRow.id,
      tenantId,
      userId,
      scope: MCP_SCOPE,
      expiresAt: new Date(
        Date.now() + parseDurationMs(env.mcpOauthRefreshTokenTtl),
      ),
    },
  });
  return refreshToken;
}

const clientsStore: OAuthRegisteredClientsStore = {
  async getClient(clientId: string) {
    const row = await basePrisma.oAuthClient.findUnique({
      where: { clientId },
    });
    if (!row || row.revokedAt) return undefined;
    return toClientInfo(row);
  },

  async registerClient(client) {
    // clientIdGeneration is on (default), so the register handler stamps
    // client_id/client_id_issued_at before calling us.
    const full = client as OAuthClientInformationFull;
    if (!full.client_id) {
      throw new ServerError("client_id missing from registration");
    }

    if (!full.redirect_uris?.length) {
      throw new InvalidClientMetadataError(
        "At least one redirect_uri is required",
      );
    }
    if (full.redirect_uris.length > 10) {
      throw new InvalidClientMetadataError("Too many redirect_uris (max 10)");
    }
    for (const uri of full.redirect_uris) {
      let parsed: URL;
      try {
        parsed = new URL(uri);
      } catch {
        throw new InvalidClientMetadataError(`Invalid redirect_uri: ${uri}`);
      }
      const isLoopback =
        parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname);
      if (parsed.protocol !== "https:" && !isLoopback) {
        throw new InvalidClientMetadataError(
          `redirect_uri must use https (or http on localhost): ${uri}`,
        );
      }
    }

    await basePrisma.oAuthClient.create({
      data: {
        clientId: full.client_id,
        clientSecret: full.client_secret ? encrypt(full.client_secret) : null,
        clientName: full.client_name ?? null,
        redirectUris: full.redirect_uris,
        grantTypes: full.grant_types ?? ["authorization_code", "refresh_token"],
        tokenEndpointAuthMethod: full.token_endpoint_auth_method ?? "none",
        scope: MCP_SCOPE,
      },
    });

    logger.log("OAuth client registered", undefined, {
      clientId: full.client_id,
      clientName: full.client_name,
    });

    // Returned value is what the client receives — plaintext secret included.
    return { ...full, scope: MCP_SCOPE };
  },
};

export const oauthServerProvider: OAuthServerProvider = {
  get clientsStore() {
    return clientsStore;
  },

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    assertResourceAllowed(params.resource);

    const clientRow = await requireClientRow(client.client_id);

    const request = await basePrisma.oAuthAuthorizationRequest.create({
      data: {
        clientId: clientRow.id,
        redirectUri: params.redirectUri,
        state: params.state ?? null,
        scope: MCP_SCOPE,
        resource: params.resource?.href ?? null,
        codeChallenge: params.codeChallenge,
        expiresAt: new Date(Date.now() + AUTH_REQUEST_TTL_MS),
      },
    });

    // Opportunistic pruning — pending requests are short-lived and there is
    // no repeatable-job scheduler in the API, so clean up here.
    basePrisma.oAuthAuthorizationRequest
      .deleteMany({
        where: { expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
      })
      .catch(() => undefined);

    const consentUrl = new URL("/oauth/consent", env.webPublicUrl);
    consentUrl.searchParams.set("request_id", request.id);
    res.redirect(302, consentUrl.href);
  },

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const request = await basePrisma.oAuthAuthorizationRequest.findUnique({
      where: { code: authorizationCode },
      include: { client: { select: { clientId: true } } },
    });
    if (
      !request ||
      request.client.clientId !== client.client_id ||
      request.codeUsedAt ||
      request.expiresAt.getTime() <= Date.now()
    ) {
      throw new InvalidGrantError("Invalid or expired authorization code");
    }
    return request.codeChallenge;
  },

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    assertResourceAllowed(resource);

    const request = await basePrisma.oAuthAuthorizationRequest.findUnique({
      where: { code: authorizationCode },
      include: { client: true },
    });
    if (
      !request ||
      request.client.clientId !== client.client_id ||
      request.expiresAt.getTime() <= Date.now() ||
      !request.approvedAt ||
      !request.tenantId ||
      !request.userId
    ) {
      throw new InvalidGrantError("Invalid or expired authorization code");
    }
    if (redirectUri && redirectUri !== request.redirectUri) {
      throw new InvalidGrantError("redirect_uri does not match");
    }

    // Atomic single-use claim — a replayed code loses the race and rejects.
    const claimed = await basePrisma.oAuthAuthorizationRequest.updateMany({
      where: { id: request.id, codeUsedAt: null },
      data: { codeUsedAt: new Date() },
    });
    if (claimed.count === 0) {
      throw new InvalidGrantError("Authorization code already used");
    }

    const { token, expiresInSeconds } = await issueAccessToken(
      request.userId,
      request.tenantId,
      request.client,
    );
    const refreshToken = await createRefreshToken(
      request.client,
      request.tenantId,
      request.userId,
      randomUUID(),
    );

    return {
      access_token: token,
      token_type: "bearer",
      expires_in: expiresInSeconds,
      refresh_token: refreshToken,
      scope: MCP_SCOPE,
    };
  },

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    _scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    assertResourceAllowed(resource);

    const row = await basePrisma.oAuthRefreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { client: true },
    });
    if (!row || row.client.clientId !== client.client_id) {
      throw new InvalidGrantError("Invalid refresh token");
    }

    // Reuse of a rotated/revoked token is a theft signal — kill the family.
    if (row.rotatedAt || row.revokedAt) {
      await basePrisma.oAuthRefreshToken.updateMany({
        where: { familyId: row.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      logger.warn(
        "OAuth refresh token reuse detected — family revoked",
        undefined,
        {
          familyId: row.familyId,
          clientId: client.client_id,
          tenantId: row.tenantId,
        },
      );
      throw new InvalidGrantError("Refresh token no longer valid");
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new InvalidGrantError("Refresh token expired");
    }

    // Rotate: claim the old row atomically, then issue a successor.
    const rotated = await basePrisma.oAuthRefreshToken.updateMany({
      where: { id: row.id, rotatedAt: null, revokedAt: null },
      data: { rotatedAt: new Date() },
    });
    if (rotated.count === 0) {
      throw new InvalidGrantError("Refresh token no longer valid");
    }

    const { token, expiresInSeconds } = await issueAccessToken(
      row.userId,
      row.tenantId,
      row.client,
    );
    const nextRefreshToken = await createRefreshToken(
      row.client,
      row.tenantId,
      row.userId,
      row.familyId,
    );

    return {
      access_token: token,
      token_type: "bearer",
      expires_in: expiresInSeconds,
      refresh_token: nextRefreshToken,
      scope: MCP_SCOPE,
    };
  },

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    let payload;
    try {
      payload = await verifyMcpToken(token);
    } catch {
      throw new InvalidTokenError("Invalid or expired token");
    }
    const row = await basePrisma.mcpToken.findUnique({
      where: { jti: payload.jti },
      select: { oauthClientId: true },
    });
    return {
      token,
      clientId: row?.oauthClientId ?? "static",
      scopes: [MCP_SCOPE],
      expiresAt: payload.exp,
      resource: new URL(MCP_RESOURCE_URL),
      extra: { tenantId: payload.tenantId, userId: payload.id },
    };
  },

  async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    const clientRow = await basePrisma.oAuthClient.findUnique({
      where: { clientId: client.client_id },
    });
    if (!clientRow) return; // RFC 7009: unknown token/client → no-op

    // Try as a refresh token first (opaque, hash lookup).
    const refreshRow = await basePrisma.oAuthRefreshToken.findUnique({
      where: { tokenHash: sha256(request.token) },
    });
    if (refreshRow && refreshRow.clientId === clientRow.id) {
      await basePrisma.oAuthRefreshToken.updateMany({
        where: { familyId: refreshRow.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      // Also revoke live access tokens from this grant.
      await basePrisma.mcpToken.updateMany({
        where: {
          oauthClientId: clientRow.id,
          tenantId: refreshRow.tenantId,
          userId: refreshRow.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      return;
    }

    // Fall back to treating it as an access token (JWT with jti row).
    try {
      const payload = await verifyMcpToken(request.token);
      await basePrisma.mcpToken.updateMany({
        where: {
          jti: payload.jti,
          oauthClientId: clientRow.id,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Invalid/expired/foreign token — RFC 7009 says respond 200 regardless.
    }
  },
};
