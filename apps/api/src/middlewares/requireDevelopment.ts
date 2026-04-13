import { Request, Response, NextFunction } from "express";
import { env } from "@/config/env";

/**
 * Returns 404 unless manual Messenger connect is allowed (local dev or staging app env).
 * Set APP_ENV=staging on the API when staging runs with NODE_ENV=production.
 */
export function requireDevelopment(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!env.manualMessengerConnectAllowed) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  next();
}
