import { Router } from "express";
import authController from "@/modules/auth/auth.controller";
import verifyToken from "@/middlewares/authMiddleware";

const authRouter = Router();

// Public routes (no authentication required)
authRouter.post('/login', authController.logIn);

// Protected routes
authRouter.get('/me', verifyToken, authController.getCurrentUser);
authRouter.post('/logout', verifyToken, authController.logOut);

export default authRouter;