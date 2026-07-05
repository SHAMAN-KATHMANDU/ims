/**
 * MCP-token auth + tenant context setup for the /mcp transport endpoint.
 *
 * Runs OUTSIDE the global verifyToken→resolveTenant chain because MCP
 * uses its own long-lived audience-scoped token (issued by /mcp/token).
 * Reuses runWithTenant so Prisma auto-scoping still applies inside tools.
 */

import { Request, Response, NextFunction } from "express";
import { basePrisma } from "@/config/prisma";
import { runWithTenant } from "@/config/tenantContext";
import { logger } from "@/config/logger";
import { env } from "@/config/env";
import { verifyMcpToken } from "./mcp.token";

// MCP auth spec: 401s MUST point clients at the protected-resource metadata
// (RFC 9728) so they can discover the authorization server and start OAuth.
const RESOURCE_METADATA_URL = `${env.oauthIssuerUrl}/.well-known/oauth-protected-resource/api/v1/mcp`;

function wwwAuthenticate(error?: string): string {
  const parts = [`Bearer resource_metadata="${RESOURCE_METADATA_URL}"`];
  if (error) parts.push(`error="${error}"`);
  return parts.join(", ");
}

export async function mcpAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .set("WWW-Authenticate", wwwAuthenticate())
      .json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Missing Bearer token" },
        id: null,
      });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  let payload;
  try {
    payload = await verifyMcpToken(token);
  } catch (err) {
    logger.warn("MCP token verification failed", undefined, { err });
    return res
      .status(401)
      .set("WWW-Authenticate", wwwAuthenticate("invalid_token"))
      .json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Invalid or expired MCP token" },
        id: null,
      });
  }

  const tenant = await basePrisma.tenant.findUnique({
    where: { id: payload.tenantId },
  });

  if (!tenant || !tenant.isActive) {
    return res.status(403).json({
      jsonrpc: "2.0",
      error: { code: -32002, message: "Tenant not found or inactive" },
      id: null,
    });
  }

  req.user = {
    id: payload.id,
    role: payload.role,
    tenantId: payload.tenantId,
    tenantSlug: payload.tenantSlug,
    username: payload.username,
    iat: payload.iat,
    exp: payload.exp,
  };
  req.tenant = tenant;

  return runWithTenant(payload.tenantId, () => next());
}
