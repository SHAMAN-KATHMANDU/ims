import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import mediaController from "./media.controller";

const mediaRouter = Router();

mediaRouter.use(authorizeRoles("user", "admin", "superAdmin"));

mediaRouter.post(
  "/presign",
  asyncHandler(mediaController.presign.bind(mediaController)),
);
mediaRouter.post(
  "/assets",
  asyncHandler(mediaController.register.bind(mediaController)),
);
mediaRouter.get(
  "/assets",
  asyncHandler(mediaController.list.bind(mediaController)),
);
mediaRouter.delete(
  "/assets/:id",
  asyncHandler(mediaController.remove.bind(mediaController)),
);

export default mediaRouter;
