import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import leadController from "./lead.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "@/middlewares/validateRequest";
import {
  assignLeadSchema,
  createLeadSchema,
  leadIdParamsSchema,
  leadListQuerySchema,
  updateLeadSchema,
} from "./lead.schema";

const leadRouter = Router();

leadRouter.use(verifyToken);
leadRouter.use(authorizeRoles("user", "admin", "superAdmin"));

leadRouter.post(
  "/",
  validateBody(createLeadSchema),
  asyncHandler(leadController.create),
);
leadRouter.get(
  "/",
  validateQuery(leadListQuerySchema),
  asyncHandler(leadController.getAll),
);
leadRouter.get(
  "/:id",
  validateParams(leadIdParamsSchema),
  asyncHandler(leadController.getById),
);
leadRouter.put(
  "/:id",
  validateParams(leadIdParamsSchema),
  validateBody(updateLeadSchema),
  asyncHandler(leadController.update),
);
leadRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  validateParams(leadIdParamsSchema),
  asyncHandler(leadController.delete),
);
leadRouter.post(
  "/:id/convert",
  validateParams(leadIdParamsSchema),
  asyncHandler(leadController.convert),
);
leadRouter.post(
  "/:id/assign",
  validateParams(leadIdParamsSchema),
  validateBody(assignLeadSchema),
  asyncHandler(leadController.assign),
);

export default leadRouter;
