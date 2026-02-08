import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { logger } from "@/config/logger";

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as any;

    // Ensure the decoded token has required fields
    if (!decoded.id || !decoded.role) {
      return res.status(401).json({
        message: "Token is missing required fields (id or role)",
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      tenantId: decoded.tenantId,
      tenantSlug: decoded.tenantSlug,
      ...decoded,
    };

    next();
  } catch (err: any) {
    logger.error("Token verification error:", err);
    return res.status(401).json({
      message: "Token is not valid",
    });
  }
};

export default verifyToken;
