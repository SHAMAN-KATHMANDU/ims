import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import dealController from "./deal.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middlewares/validateRequest";
import {
  createDealSchema,
  dealIdParamsSchema,
  dealListQuerySchema,
  dealPipelineQuerySchema,
  updateDealSchema,
  updateDealStageSchema,
} from "./deal.schema";

const dealRouter = Router();

dealRouter.use(verifyToken);
dealRouter.use(authorizeRoles("user", "admin", "superAdmin"));

dealRouter.post(
  "/",
  validateBody(createDealSchema),
  asyncHandler(dealController.create),
);
dealRouter.get(
  "/kanban",
  validateQuery(dealPipelineQuerySchema),
  asyncHandler(dealController.getByPipeline),
);
dealRouter.get(
  "/",
  validateQuery(dealListQuerySchema),
  asyncHandler(dealController.getAll),
);
dealRouter.get(
  "/:id",
  validateParams(dealIdParamsSchema),
  asyncHandler(dealController.getById),
);
dealRouter.put(
  "/:id",
  validateParams(dealIdParamsSchema),
  validateBody(updateDealSchema),
  asyncHandler(dealController.update),
);
dealRouter.patch(
  "/:id/stage",
  validateParams(dealIdParamsSchema),
  validateBody(updateDealStageSchema),
  asyncHandler(dealController.updateStage),
);
dealRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  validateParams(dealIdParamsSchema),
  asyncHandler(dealController.delete),
);

export default dealRouter;
