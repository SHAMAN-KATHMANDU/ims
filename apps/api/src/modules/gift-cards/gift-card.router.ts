import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
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
 *     summary: Create gift card
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
giftCardRouter.get(
  "/",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(giftCardController.getAllGiftCards),
);
giftCardRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(giftCardController.createGiftCard),
);
giftCardRouter.get(
  "/:id",
  authorizeRoles("user", "admin", "superAdmin"),
  asyncHandler(giftCardController.getGiftCardById),
);
giftCardRouter.patch(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(giftCardController.updateGiftCard),
);

export default giftCardRouter;

export const publicGiftCardRouter = Router();
publicGiftCardRouter.use(resolveTenantFromHostname());
publicGiftCardRouter.post(
  "/redeem",
  asyncHandler(giftCardController.redeemGiftCard),
);
