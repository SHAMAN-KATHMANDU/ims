import { Request, Response, NextFunction } from "express";
import { env } from "@/config/env";

/**
 * Returns 404 unless NODE_ENV is development. Use for dev-only endpoints (e.g. manual Messenger connect).
 */
export function requireDevelopment(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!env.isDev) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  next();
}
