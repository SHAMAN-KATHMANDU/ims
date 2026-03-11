import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { JwtPayloadSchema } from "@/modules/auth/auth.schema";

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
    const decoded = jwt.verify(token, env.jwtSecret);

    const parsed = JwtPayloadSchema.safeParse(decoded);
    if (!parsed.success) {
      logger.warn("Token validation failed", undefined, {
        errors: parsed.error.flatten(),
      });
      return res.status(401).json({
        message: "Token is not valid",
      });
    }

    req.user = {
      id: parsed.data.id,
      role: parsed.data.role,
      tenantId: parsed.data.tenantId,
      tenantSlug: parsed.data.tenantSlug,
      username: parsed.data.username,
      iat: parsed.data.iat,
      exp: parsed.data.exp,
    };

    next();
  } catch (err: unknown) {
    logger.error("Token verification error", undefined, { err });
    return res.status(401).json({
      message: "Token is not valid",
    });
  }
};

export default verifyToken;
