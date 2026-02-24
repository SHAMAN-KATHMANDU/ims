import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import activityController from "./activity.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const activityRouter = Router();

activityRouter.use(authorizeRoles("user", "admin", "superAdmin"));

activityRouter.post("/", asyncHandler(activityController.create));
activityRouter.get(
  "/contact/:contactId",
  asyncHandler(activityController.getByContact),
);
activityRouter.get("/deal/:dealId", asyncHandler(activityController.getByDeal));
activityRouter.get("/:id", asyncHandler(activityController.getById));
activityRouter.delete("/:id", asyncHandler(activityController.delete));

export default activityRouter;
