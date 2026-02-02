import { Request, Response, NextFunction } from "express";
import {
  buildAnalyticsCacheKey,
  getCachedAnalytics,
  setCachedAnalytics,
} from "@/utils/analyticsCache";

/**
 * Middleware for analytics GET routes: serve cached JSON when the same user
 * requests the same endpoint with the same query within TTL; otherwise run
 * the route and cache successful 200 JSON responses.
 */
export function analyticsCacheMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const userId = (req as any).user?.id as string | undefined;
  const key = buildAnalyticsCacheKey(
    req.path,
    userId,
    req.query as Record<string, unknown>,
  );

  const cached = getCachedAnalytics(key);
  if (cached !== undefined) {
    res.status(200).json(cached);
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = function (body: unknown): Response {
    if (res.statusCode === 200) {
      setCachedAnalytics(key, body);
    }
    return originalJson(body);
  };

  next();
}
