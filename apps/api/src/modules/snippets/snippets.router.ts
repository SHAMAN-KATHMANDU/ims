/**
 * Snippets Router — Phase 5 reusable block sub-trees.
 *
 * Permission: snippets are page-content-adjacent, so we reuse the
 * WEBSITE.PAGES.* perm set rather than minting a new module.
 */

import { Router } from "express";
import { EnvFeature } from "@repo/shared";
import { enforceEnvFeature } from "@/middlewares/enforceEnvFeature";
import { asyncHandler } from "@/middlewares/errorHandler";
import { requirePermission } from "@/middlewares/requirePermission";
import { workspaceLocator } from "@/shared/permissions/resourceLocator";
import controller from "./snippets.controller";

const router = Router();

router.use(enforceEnvFeature(EnvFeature.TENANT_WEBSITES));

/**
 * @swagger
 * /snippets:
 *   get:
 *     summary: List reusable block snippets for the current tenant
 *     tags: [Snippets]
 */
router.get(
  "/",
  requirePermission("WEBSITE.PAGES.VIEW", workspaceLocator()),
  asyncHandler(controller.list),
);

/**
 * @swagger
 * /snippets:
 *   post:
 *     summary: Create a new snippet
 *     tags: [Snippets]
 */
router.post(
  "/",
  requirePermission("WEBSITE.PAGES.CREATE", workspaceLocator()),
  asyncHandler(controller.create),
);

/**
 * @swagger
 * /snippets/{id}:
 *   get:
 *     summary: Get a snippet by id
 *     tags: [Snippets]
 */
router.get(
  "/:id",
  requirePermission("WEBSITE.PAGES.VIEW", workspaceLocator()),
  asyncHandler(controller.get),
);

/**
 * @swagger
 * /snippets/{id}:
 *   patch:
 *     summary: Update a snippet
 *     tags: [Snippets]
 */
router.patch(
  "/:id",
  requirePermission("WEBSITE.PAGES.UPDATE", workspaceLocator()),
  asyncHandler(controller.update),
);

/**
 * @swagger
 * /snippets/{id}:
 *   delete:
 *     summary: Delete a snippet
 *     tags: [Snippets]
 */
router.delete(
  "/:id",
  requirePermission("WEBSITE.PAGES.DELETE", workspaceLocator()),
  asyncHandler(controller.remove),
);

export default router;
