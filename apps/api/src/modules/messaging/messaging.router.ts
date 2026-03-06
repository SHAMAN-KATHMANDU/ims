import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import messagingController from "./messaging.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const messagingRouter = Router();

messagingRouter.use(enforcePlanFeature("messaging"));
messagingRouter.use(authorizeRoles("user", "admin", "superAdmin"));

messagingRouter.get(
  "/conversations",
  asyncHandler(messagingController.getConversations),
);

messagingRouter.get(
  "/conversations/:id",
  asyncHandler(messagingController.getConversation),
);

messagingRouter.put(
  "/conversations/:id",
  asyncHandler(messagingController.updateConversation),
);

messagingRouter.get(
  "/conversations/:id/messages",
  asyncHandler(messagingController.getMessages),
);

messagingRouter.post(
  "/conversations/:id/messages",
  asyncHandler(messagingController.sendMessage),
);

messagingRouter.post(
  "/conversations/:id/mark-read",
  asyncHandler(messagingController.markRead),
);

export default messagingRouter;
