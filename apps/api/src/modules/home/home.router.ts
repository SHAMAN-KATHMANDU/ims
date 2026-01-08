import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import homeController from "@/modules/home/home.controller";

const homeRouter = Router();

// Get home data (all authenticated users)
homeRouter.get(
  '/',
  verifyToken,
  homeController.getHome
);

export default homeRouter;

