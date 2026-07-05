/**
 * /oauth/consent — the bridge between the SDK's /authorize endpoint and the
 * apps/web consent page.
 *
 * /authorize stores a pending OAuthAuthorizationRequest (no tenant/user yet)
 * and redirects the browser to the web app. The consent page — behind the
 * normal login — calls these endpoints with the user's JWT:
 *
 *   GET  /:requestId           → what to display (client name, scope, host)
 *   POST /:requestId/decision  → approve/deny; approval binds tenantId/userId
 *                                and mints the single-use authorization code
 *
 * Mounted under verifyToken → resolveTenant → checkSubscription
 * (router.config.ts), and gated by SETTINGS.MCP.MANAGE — the same permission
 * that guards static MCP-token minting, so OAuth grants don't widen access.
 */

import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";
import { basePrisma } from "@/config/prisma";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import { asyncHandler } from "@/middlewares/errorHandler";
import { ok, fail } from "@/shared/response";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { logger } from "@/config/logger";
import { CODE_TTL_MS } from "./oauth.provider";

const oauthConsentRouter = Router();

const DecisionBodySchema = z.object({
  approved: z.boolean(),
});

const decisionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req: Request) =>
    req.user?.id ?? ipKeyGenerator(req.ip ?? "unknown"),
  standardHeaders: false,
  skip: (req: Request) => !req.user,
});

oauthConsentRouter.use(
  requirePermission("SETTINGS.MCP.MANAGE", workspaceLocator()),
);

function buildRedirect(
  redirectUri: string,
  params: Record<string, string>,
): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.href;
}

oauthConsentRouter.get(
  "/:requestId",
  asyncHandler(async (req: Request, res: Response) => {
    const requestId = req.params.requestId;
    if (!requestId) return fail(res, "Request id required", 400);

    const request = await basePrisma.oAuthAuthorizationRequest.findUnique({
      where: { id: requestId },
      include: { client: { select: { clientName: true } } },
    });
    if (!request) {
      return fail(res, "Authorization request not found", 404);
    }
    if (request.approvedAt || request.expiresAt.getTime() <= Date.now()) {
      return fail(res, "Authorization request expired or already handled", 410);
    }

    return ok(res, {
      clientName: request.client.clientName ?? "Unknown application",
      scope: request.scope,
      redirectHost: new URL(request.redirectUri).host,
    });
  }),
);

oauthConsentRouter.post(
  "/:requestId/decision",
  decisionLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const auth = getAuthContext(req);
    const requestId = req.params.requestId;
    if (!requestId) return fail(res, "Request id required", 400);

    const parsed = DecisionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, "approved (boolean) is required", 400);
    }

    const request = await basePrisma.oAuthAuthorizationRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      return fail(res, "Authorization request not found", 404);
    }
    if (request.approvedAt || request.expiresAt.getTime() <= Date.now()) {
      return fail(res, "Authorization request expired or already handled", 410);
    }

    const stateParam = request.state ? { state: request.state } : {};

    if (!parsed.data.approved) {
      // Burn the request so a stolen request_id can't be replayed later.
      await basePrisma.oAuthAuthorizationRequest.update({
        where: { id: request.id },
        data: { expiresAt: new Date() },
      });
      return ok(res, {
        redirectTo: buildRedirect(request.redirectUri, {
          error: "access_denied",
          error_description: "The user denied the request",
          ...stateParam,
        }),
      });
    }

    // Approve: bind the grant to the approving user's tenant + identity and
    // mint the single-use code. updateMany guards against double-approval.
    const code = randomBytes(32).toString("base64url");
    const approved = await basePrisma.oAuthAuthorizationRequest.updateMany({
      where: { id: request.id, approvedAt: null, codeUsedAt: null },
      data: {
        code,
        tenantId: auth.tenantId,
        userId: auth.userId,
        approvedAt: new Date(),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });
    if (approved.count === 0) {
      return fail(res, "Authorization request expired or already handled", 410);
    }

    logger.log("OAuth consent granted", undefined, {
      requestId: request.id,
      tenantId: auth.tenantId,
      userId: auth.userId,
    });

    return ok(res, {
      redirectTo: buildRedirect(request.redirectUri, {
        code,
        ...stateParam,
      }),
    });
  }),
);

export default oauthConsentRouter;
