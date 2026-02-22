import { Request, Response } from "express";
import User, { Role } from "@/models/userModel";
import bcrypt from "bcryptjs";
import prisma from "@/config/prisma";
import {
  getPaginationParams,
  createPaginationResult,
  getPrismaOrderBy,
} from "@/utils/pagination";
import { sendControllerError } from "@/utils/controllerError";

class UserController {
  // Create user (only superAdmin)
  async createUser(req: Request, res: Response) {
    try {
      const { username, password, role } = req.body;

      const normalizedUsername = username.toLowerCase().trim();
      // Check if user already exists (within this tenant, auto-scoped)
      const existingUser = await User.findFirst({
        where: { username: normalizedUsername },
      });

      if (existingUser) {
        return res
          .status(409)
          .json({ message: "User with this username already exists" });
      }

      // Hash the password before storing
      // Note: Standard practice is to hash passwords on the backend for security
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        data: {
          tenantId: req.user!.tenantId,
          username: normalizedUsername,
          password: hashedPassword,
          role: role as Role,
        },
      });

      // Don't send password in response
      const { password: _, ...userWithoutPassword } = newUser;

      res.status(201).json({
        message: `User created successfully with username ${normalizedUsername}`,
        user: userWithoutPassword,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Create user error");
    }
  }

  // Get all users (only superAdmin)
  async getAllUsers(req: Request, res: Response) {
    try {
      const query = req.query as {
        page?: number;
        limit?: number;
        search?: string;
        sortBy?: "id" | "username" | "role" | "createdAt" | "updatedAt";
        sortOrder?: "asc" | "desc";
      };
      const { page, limit, sortBy, sortOrder, search } =
        getPaginationParams(query);

      // Allowed fields for sorting
      const allowedSortFields = [
        "id",
        "username",
        "role",
        "createdAt",
        "updatedAt",
      ];

      // Get orderBy for Prisma
      const orderBy = getPrismaOrderBy(
        sortBy,
        sortOrder,
        allowedSortFields,
      ) || {
        createdAt: "desc",
      };

      // Build search filter
      const where: any = {};
      if (search) {
        where.OR = [
          { username: { contains: search, mode: "insensitive" } },
          { role: { contains: search, mode: "insensitive" } },
        ];
      }

      // Calculate skip for pagination
      const skip = (page - 1) * limit;

      // Get total count and users in parallel
      const [totalItems, users] = await Promise.all([
        prisma.user.count({ where }),
        User.findMany({
          where,
          select: {
            id: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      const result = createPaginationResult(users, totalItems, page, limit);

      res.status(200).json({
        message: "Users fetched successfully",
        ...result,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get all users error");
    }
  }

  // Get user by ID (only superAdmin)
  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };

      const user = await User.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({
        message: "User fetched successfully",
        user,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get user by ID error");
    }
  }

  // Update user (only superAdmin)
  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { username, password, role } = req.body;

      // Check if user exists
      const existingUser = await User.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prepare update data
      const updateData: any = {};

      if (username) {
        // Check if new username is already taken by another user (within this tenant)
        const normalizedUsername = username.toLowerCase().trim();
        const usernameExists = await User.findFirst({
          where: { username: normalizedUsername },
        });

        if (usernameExists && usernameExists.id !== id) {
          return res.status(409).json({ message: "Username already taken" });
        }

        updateData.username = normalizedUsername;
      }

      if (password) {
        // Hash the new password
        updateData.password = await bcrypt.hash(password, 10);
      }

      if (role) {
        updateData.role = role as Role;
      }

      const updatedUser = await User.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(200).json({
        message: "User updated successfully",
        user: updatedUser,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Update user error");
    }
  }

  // Delete user (only superAdmin)
  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };

      // Check if user exists
      const existingUser = await User.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent deleting yourself
      if (req.user && req.user.id === id) {
        return res
          .status(400)
          .json({ message: "You cannot delete your own account" });
      }

      await User.delete({
        where: { id },
      });

      res.status(200).json({
        message: "User deleted successfully",
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Delete user error");
    }
  }
}

export default new UserController();
