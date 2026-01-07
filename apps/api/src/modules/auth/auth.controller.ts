import { Request, Response } from "express";
import User from "@/models/userModel";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

class AuthController {
  async logIn(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      
      console.log("🔐 Login attempt:", { username, hasPassword: !!password });
      
      // Normalize username - trim and handle case
      const normalizedUsername = username?.toString().toLowerCase().trim();
      
      if (!normalizedUsername || !password) {
        console.log("❌ Missing credentials");
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      console.log("🔐 Login attempt for:", normalizedUsername);

      // Try exact match first, then case-insensitive
      let user = await User.findUnique({ 
        where: { username: normalizedUsername } 
      });
      
      // If not found, try original username (in case it's stored with different case)
      if (!user && username !== normalizedUsername) {
        user = await User.findUnique({ 
          where: { username: username.toString().trim() } 
        });
      }

      if (!user) {
        console.log("❌ User not found:", normalizedUsername);
        return res.status(401).json({ message: "Invalid username or password" });
      }

      console.log("✅ User found:", { id: user.id, username: user.username, role: user.role });

      // Verify the password from frontend with the stored hashed password
      // bcrypt.compare handles the comparison securely
      const isMatch = await bcrypt.compare(password.toString(), user.password);
      
      console.log("🔑 Password match:", isMatch);
      
      if (!isMatch) {
        console.log("❌ Password mismatch for user:", user.username);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      console.log("✅ Login successful for:", user.username);

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role }, 
        process.env.JWT_SECRET!, 
        { expiresIn: "24h" }
      );

      // Return token and user info (without password)
      const { password: _, ...userWithoutPassword } = user;

      res.status(200).json({ 
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Login error:", error);
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
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({ user });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async logOut(req: Request, res: Response) {
    try {
      // Since JWT is stateless, logout is handled on frontend by removing token
      // This endpoint just confirms the token was valid
      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default new AuthController();