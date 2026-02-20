import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import leadController from "./lead.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const leadRouter = Router();

leadRouter.use(verifyToken);
leadRouter.use(authorizeRoles("user", "admin", "superAdmin"));

leadRouter.post("/", asyncHandler(leadController.create));
leadRouter.get("/", asyncHandler(leadController.getAll));
leadRouter.get("/:id", asyncHandler(leadController.getById));
leadRouter.put("/:id", asyncHandler(leadController.update));
leadRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(leadController.delete),
);
leadRouter.post("/:id/convert", asyncHandler(leadController.convert));
leadRouter.post("/:id/assign", asyncHandler(leadController.assign));

export default leadRouter;
