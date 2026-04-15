/**
 * Public Site Layouts Router — unauthenticated reads of PUBLISHED block
 * layouts. Mounted under /public/site-layouts BEFORE the auth chain.
 * Tenant comes from the request Host header via resolveTenantFromHostname.
 *
 * Only returns the `blocks` column (never `draftBlocks`) and only for
 * tenants whose SiteConfig is websiteEnabled + isPublished — we 404
 * everything else to avoid leaking the existence of unpublished sites.
 */

import { Router, Request, Response } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler, AppError } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { resolveTenantFromHostname } from "@/middlewares/hostnameResolver";
import { sendControllerError } from "@/utils/controllerError";
import sitesRepo from "@/modules/sites/sites.repository";
import defaultRepo from "./site-layouts.repository";
import { SiteLayoutScopeEnum } from "./site-layouts.schema";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));
router.use(resolveTenantFromHostname());

function getTenantId(req: Request): string {
  const tenantId = req.tenant?.id;
  if (!tenantId) {
    const err = new Error("Host not resolved") as AppError;
    err.statusCode = 400;
    throw err;
  }
  return tenantId;
}

async function ensurePublished(tenantId: string): Promise<void> {
  const config = await sitesRepo.findConfig(tenantId);
  if (!config || !config.websiteEnabled || !config.isPublished) {
    const err = new Error("Not found") as AppError;
    err.statusCode = 404;
    throw err;
  }
}

/**
 * @swagger
 * /public/site-layouts/{scope}:
 *   get:
 *     summary: Get the published block tree for a scope
 *     tags: [PublicSiteLayouts]
 *     parameters:
 *       - in: path
 *         name: scope
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: pageId
 *         schema: { type: string, format: uuid }
 */
router.get(
  "/:scope",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      await ensurePublished(tenantId);

      const scope = SiteLayoutScopeEnum.parse(req.params.scope);
      const rawPageId = req.query.pageId;
      const pageId =
        typeof rawPageId === "string" && rawPageId.length > 0
          ? rawPageId
          : null;

      const row = await defaultRepo.findByKey(tenantId, { scope, pageId });
      if (!row) return res.status(404).json({ message: "Not found" });

      // Only return the published tree + the key — never draftBlocks.
      return res.status(200).json({
        message: "OK",
        layout: {
          scope: row.scope,
          pageId: row.pageId,
          blocks: row.blocks,
          version: row.version,
          updatedAt: row.updatedAt,
        },
      });
    } catch (error) {
      const err = error as AppError;
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Get public site layout error",
      );
    }
  }),
);

export default router;
