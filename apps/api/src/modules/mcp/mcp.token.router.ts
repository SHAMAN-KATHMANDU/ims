/**
 * /mcp/tokens — MCP access-token management.
 *
 * Mounted under the global verifyToken → resolveTenant → checkSubscription
 * chain (router.config.ts). The user mints a token here, then pastes it
 * into their MCP client. Revocation lands instantly because verifyMcpToken
 * (used by /mcp) re-checks the row on every request.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "@/config/prisma";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import { asyncHandler } from "@/middlewares/errorHandler";
import { ok, fail } from "@/shared/response";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { logger } from "@/config/logger";
import { signMcpToken } from "./mcp.token";

const mcpTokenRouter = Router();

const MCP_HTTP_PATH = "/api/v1/mcp";

const CreateBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

mcpTokenRouter.use(
  requirePermission("SETTINGS.MCP.MANAGE", workspaceLocator()),
);

mcpTokenRouter.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const auth = getAuthContext(req);
    if (!req.user?.tenantSlug) {
      return fail(res, "Tenant context required", 403);
    }

    const parsed = CreateBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, parsed.error.errors[0]?.message ?? "Invalid name", 400);
    }

    const issued = await signMcpToken({
      id: auth.userId,
      role: (auth.role ?? "user") as
        | "platformAdmin"
        | "superAdmin"
        | "admin"
        | "user",
      tenantId: auth.tenantId,
      tenantSlug: req.user.tenantSlug,
      username: req.user.username,
      name: parsed.data.name,
    });

    return ok(
      res,
      {
        id: issued.id,
        name: parsed.data.name,
        token: issued.token,
        expiresIn: issued.expiresIn,
        expiresAt: issued.expiresAt,
        tokenType: "Bearer",
        audience: "ims-mcp",
        mcpUrl: MCP_HTTP_PATH,
      },
      201,
    );
  }),
);

mcpTokenRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const auth = getAuthContext(req);
    const tokens = await prisma.mcpToken.findMany({
      where: { tenantId: auth.tenantId, userId: auth.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },
    });
    return ok(res, { tokens });
  }),
);

mcpTokenRouter.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const auth = getAuthContext(req);
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
      return fail(res, "Token id required", 400);
    }

    const row = await prisma.mcpToken.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!row) {
      return fail(res, "MCP token not found", 404);
    }

    // Either the issuing user, or an admin/superAdmin, can revoke.
    const isOwner = row.userId === auth.userId;
    const isAdmin = auth.role === "admin" || auth.role === "superAdmin";
    if (!isOwner && !isAdmin) {
      return fail(res, "Not allowed to revoke this token", 403);
    }

    if (row.revokedAt) {
      // Idempotent — re-revoking is a no-op.
      return ok(res, { id: row.id, revokedAt: row.revokedAt });
    }

    const updated = await prisma.mcpToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
      select: { id: true, revokedAt: true },
    });

    logger.log("MCP token revoked", undefined, {
      tokenId: updated.id,
      tenantId: auth.tenantId,
      userId: auth.userId,
    });

    return ok(res, updated);
  }),
);

export default mcpTokenRouter;
