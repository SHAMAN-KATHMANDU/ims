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
import { verifyMcpToken } from "./mcp.token";

export async function mcpAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
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
    return res.status(401).json({
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
