import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import activityController from "./activity.controller";

const activityRouter = Router();

activityRouter.use(verifyToken);
activityRouter.use(authorizeRoles("user", "admin", "superAdmin"));

activityRouter.post("/", activityController.create);
activityRouter.get("/contact/:contactId", activityController.getByContact);
activityRouter.get("/deal/:dealId", activityController.getByDeal);
activityRouter.get("/:id", activityController.getById);
activityRouter.delete("/:id", activityController.delete);

export default activityRouter;
