import { Request, Response } from "express";
import User from "@/models/userModel";
import prisma from "@/config/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

class AuthController {
  async logIn(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      // Debug logs only in development
      if (env.isDev) {
        logger.log("Login attempt", req.requestId, {
          username,
          hasPassword: !!password,
        });
      }

      // Normalize username - trim and handle case
      const normalizedUsername = username?.toString().toLowerCase().trim();

      if (!normalizedUsername || !password) {
        return res
          .status(400)
          .json({ message: "Username and password are required" });
      }

      // Try exact match first, then case-insensitive
      let user = await User.findUnique({
        where: { username: normalizedUsername },
      });

      // If not found, try original username (in case it's stored with different case)
      if (!user && username !== normalizedUsername) {
        user = await User.findUnique({
          where: { username: username.toString().trim() },
        });
      }

      if (!user) {
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      // Verify the password from frontend with the stored hashed password
      // bcrypt.compare handles the comparison securely
      const isMatch = await bcrypt.compare(password.toString(), user.password);

      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Invalid username or password" });
      }

      // Update lastLoginAt and record audit log (LOGIN)
      const now = new Date();
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN",
          resource: "auth",
          resourceId: user.id,
          details: { username: user.username },
          ip: req.ip ?? req.socket?.remoteAddress ?? undefined,
          userAgent: req.get("user-agent") ?? undefined,
        },
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        env.jwtSecret,
        { expiresIn: "24h" },
      );

      // Return token and user info (without password)
      const { password: _, ...userWithoutPassword } = user;

      res.status(200).json({
        token,
        user: userWithoutPassword,
      });
    } catch (error) {
      logger.error("Login error", req.requestId, error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await User.findUnique({
        where: { id: req.user.id },
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

      res.status(200).json({ user });
    } catch (error) {
      logger.error("Get current user error", req.requestId, error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async logOut(req: Request, res: Response) {
    try {
      // Since JWT is stateless, logout is handled on frontend by removing token
      // This endpoint just confirms the token was valid
      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      logger.error("Logout error", req.requestId, error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default new AuthController();
