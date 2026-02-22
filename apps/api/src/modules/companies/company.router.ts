import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import companyController from "./company.controller";
import { asyncHandler } from "@/middlewares/errorHandler";
import { validateBody, validateQuery } from "@/middlewares/validateRequest";
import {
  companyListQuerySchema,
  createCompanySchema,
  updateCompanySchema,
} from "./company.schema";

const companyRouter = Router();

companyRouter.use(verifyToken);
companyRouter.use(authorizeRoles("user", "admin", "superAdmin"));

companyRouter.get("/list", asyncHandler(companyController.listForSelect));
companyRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  validateBody(createCompanySchema),
  asyncHandler(companyController.create),
);
companyRouter.get(
  "/",
  validateQuery(companyListQuerySchema),
  asyncHandler(companyController.getAll),
);
companyRouter.get("/:id", asyncHandler(companyController.getById));
companyRouter.put(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  validateBody(updateCompanySchema),
  asyncHandler(companyController.update),
);
companyRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(companyController.delete),
);

export default companyRouter;
