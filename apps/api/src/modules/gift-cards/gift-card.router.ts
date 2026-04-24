import { Router } from "express";
import { requirePermission } from "@/middlewares/requirePermission";
import {
  paramLocator,
  workspaceLocator,
} from "@/shared/permissions/resourceLocator";
import { asyncHandler } from "@/middlewares/errorHandler";
import { resolveTenantFromHostname } from "@/middlewares/hostnameResolver";
import giftCardController from "./gift-card.controller";

const giftCardRouter = Router();

/**
 * @swagger
 * /gift-cards:
 *   get:
 *     summary: List gift cards (paginated)
 *     tags: [GiftCards]
 *     security: [{ bearerAuth: [] }]
 *   post:
 *     summary: Create (issue) gift card
 *     tags: [GiftCards]
 *     security: [{ bearerAuth: [] }]
 * /gift-cards/{id}:
 *   get:
 *     summary: Get gift card by id
 *     tags: [GiftCards]
 *   patch:
 *     summary: Update gift card (status / expiresAt / balance adjust)
 *     tags: [GiftCards]
 */
// List — service-layer filterVisible (Phase 3 follow-up). See RBAC_CONTRACT §5.
giftCardRouter.get("/", asyncHandler(giftCardController.getAllGiftCards));
// Creating a gift card = issuing it → ISSUE permission
giftCardRouter.post(
  "/",
  requirePermission("INVENTORY.GIFT_CARDS.ISSUE", workspaceLocator()),
  asyncHandler(giftCardController.createGiftCard),
);
giftCardRouter.get(
  "/:id",
  requirePermission("INVENTORY.GIFT_CARDS.VIEW", paramLocator("GIFT_CARD")),
  asyncHandler(giftCardController.getGiftCardById),
);
giftCardRouter.patch(
  "/:id",
  requirePermission("INVENTORY.GIFT_CARDS.UPDATE", paramLocator("GIFT_CARD")),
  asyncHandler(giftCardController.updateGiftCard),
);

export default giftCardRouter;

export const publicGiftCardRouter = Router();
publicGiftCardRouter.use(resolveTenantFromHostname());
publicGiftCardRouter.post(
  "/redeem",
  asyncHandler(giftCardController.redeemGiftCard),
);
