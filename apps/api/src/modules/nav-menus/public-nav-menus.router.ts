/**
 * Public Nav Menus Router — unauthenticated reads of nav menus for the
 * tenant-site renderer. Tenant comes from the request Host header.
 * Only returns menus for tenants whose SiteConfig is websiteEnabled +
 * isPublished; 404 otherwise to avoid leaking draft sites.
 */

import { Router, Request, Response } from "express";
import { EnvFeature } from "@repo/shared";
import { asyncHandler, AppError } from "@/middlewares/errorHandler";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { resolveTenantFromHostname } from "@/middlewares/hostnameResolver";
import { sendControllerError } from "@/utils/controllerError";
import sitesRepo from "@/modules/sites/sites.repository";
import defaultRepo from "./nav-menus.repository";
import { NavSlotEnum } from "./nav-menus.schema";

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
 * /public/nav-menus/{slot}:
 *   get:
 *     summary: Get the nav menu for a slot (header-primary, footer-1, ...)
 *     tags: [PublicNavMenus]
 */
router.get(
  "/:slot",
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      await ensurePublished(tenantId);
      const slot = NavSlotEnum.parse(req.params.slot);
      const row = await defaultRepo.findBySlot(tenantId, slot);
      if (!row) return res.status(404).json({ message: "Not found" });
      return res.status(200).json({
        message: "OK",
        menu: {
          slot: row.slot,
          items: row.items,
          updatedAt: row.updatedAt,
        },
      });
    } catch (error) {
      const err = error as AppError;
      if (err.statusCode) {
        return res.status(err.statusCode).json({ message: err.message });
      }
      return sendControllerError(req, res, error, "Get public nav menu error");
    }
  }),
);

export default router;
