import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import companyController from "./company.controller";

const companyRouter = Router();

companyRouter.use(verifyToken);
companyRouter.use(authorizeRoles("user", "admin", "superAdmin"));

companyRouter.get("/list", companyController.listForSelect);
companyRouter.post(
  "/",
  authorizeRoles("admin", "superAdmin"),
  companyController.create,
);
companyRouter.get("/", companyController.getAll);
companyRouter.get("/:id", companyController.getById);
companyRouter.put(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  companyController.update,
);
companyRouter.delete(
  "/:id",
  authorizeRoles("admin", "superAdmin"),
  companyController.delete,
);

export default companyRouter;
