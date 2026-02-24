import { Request, Response, NextFunction } from "express";
import { getAuthContext } from "@/shared/auth/getAuthContext";

const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.authContext ?? getAuthContext(req);
    if (!auth) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userRole = auth.role as string;

    if (!userRole) {
      return res.status(403).json({ message: "User role not found in token" });
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        message: "Unauthorized",
        required: roles,
        current: userRole,
      });
    }
    next();
  };
};

export default authorizeRoles;
