import { Request, Response } from "express";
import User from "@/models/userModel";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

class AuthController {
  async logIn(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await User.findUnique({ 
        where: { username } 
      });

      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Verify the password from frontend with the stored hashed password
      // bcrypt.compare handles the comparison securely
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, role: user.role }, 
        process.env.JWT_SECRET!, 
        { expiresIn: "1h" }
      );

      res.status(200).json({ token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async logOut(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      
      if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
      }

      jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
        if (err) {
          return res.status(401).json({ message: "Token is not valid" });
        }
      });

      res.status(200).json({ message: "Logout successful" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
}

export default new AuthController();