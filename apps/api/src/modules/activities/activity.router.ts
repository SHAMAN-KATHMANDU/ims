import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import activityController from "./activity.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import { validateBody, validateParams } from "@/middlewares/validateRequest";
import {
  activityIdParamsSchema,
  contactIdParamsSchema,
  createActivitySchema,
  dealIdParamsSchema,
} from "./activity.schema";

const activityRouter = Router();

activityRouter.use(verifyToken);
activityRouter.use(authorizeRoles("user", "admin", "superAdmin"));

activityRouter.post(
  "/",
  validateBody(createActivitySchema),
  asyncHandler(activityController.create),
);
activityRouter.get(
  "/contact/:contactId",
  validateParams(contactIdParamsSchema),
  asyncHandler(activityController.getByContact),
);
activityRouter.get(
  "/deal/:dealId",
  validateParams(dealIdParamsSchema),
  asyncHandler(activityController.getByDeal),
);
activityRouter.get(
  "/:id",
  validateParams(activityIdParamsSchema),
  asyncHandler(activityController.getById),
);
activityRouter.delete(
  "/:id",
  validateParams(activityIdParamsSchema),
  asyncHandler(activityController.delete),
);

export default activityRouter;
