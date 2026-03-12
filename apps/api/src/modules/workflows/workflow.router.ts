import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import workflowController from "./workflow.controller";

const workflowRouter = Router();

workflowRouter.use(authorizeRoles("admin", "superAdmin"));

workflowRouter.get("/", asyncHandler(workflowController.getAll));
workflowRouter.get("/:id", asyncHandler(workflowController.getById));
workflowRouter.post("/", asyncHandler(workflowController.create));
workflowRouter.put("/:id", asyncHandler(workflowController.update));
workflowRouter.delete("/:id", asyncHandler(workflowController.delete));

export default workflowRouter;
