import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import companyController from "./company.controller";
import { asyncHandler } from "@/middlewares/errorHandler";

const companyRouter = Router();

companyRouter.use(authorizeRoles("user", "admin", "superAdmin"));

companyRouter.get("/list", asyncHandler(companyController.listForSelect));
companyRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(companyController.create),
);
companyRouter.get("/", asyncHandler(companyController.getAll));
companyRouter.get("/:id", asyncHandler(companyController.getById));
companyRouter.put(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(companyController.update),
);
companyRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(companyController.delete),
);

export default companyRouter;
