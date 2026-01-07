import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import userController from "@/modules/users/user.controller";

const userRouter = Router();

// ========== User CRUD Operations (superAdmin only) ==========
// Create user
userRouter.post(
  '/',
  verifyToken,
  authorizeRoles("superAdmin"),
  userController.createUser
);

// Get all users
userRouter.get(
  '/',
  verifyToken,
  authorizeRoles("superAdmin"),
  userController.getAllUsers
);

// Get user by ID
userRouter.get(
  '/:id',
  verifyToken,
  authorizeRoles("superAdmin"),
  userController.getUserById
);

// Update user
userRouter.put(
  '/:id',
  verifyToken,
  authorizeRoles("superAdmin"),
  userController.updateUser
);

// Delete user
userRouter.delete(
  '/:id',
  verifyToken,
  authorizeRoles("superAdmin"),
  userController.deleteUser
);

export default userRouter;