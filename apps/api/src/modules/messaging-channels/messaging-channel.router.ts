import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import messagingChannelController from "./messaging-channel.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const messagingChannelRouter = Router();

messagingChannelRouter.use(enforcePlanFeature("messaging"));
messagingChannelRouter.use(authorizeRoles("admin", "superAdmin"));

messagingChannelRouter.get(
  "/",
  asyncHandler(messagingChannelController.getAll),
);

messagingChannelRouter.get(
  "/:id",
  asyncHandler(messagingChannelController.getById),
);

messagingChannelRouter.post(
  "/",
  asyncHandler(messagingChannelController.connect),
);

messagingChannelRouter.put(
  "/:id",
  asyncHandler(messagingChannelController.update),
);

messagingChannelRouter.delete(
  "/:id",
  asyncHandler(messagingChannelController.disconnect),
);

export default messagingChannelRouter;
