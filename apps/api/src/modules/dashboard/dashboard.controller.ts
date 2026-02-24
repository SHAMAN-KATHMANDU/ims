import { Request, Response } from "express";
import { ok } from "@/shared/response";
import { getCached, setCached } from "./dashboardCache";
import * as dashboardService from "./dashboard.service";

class DashboardController {
  async getUserSummary(req: Request, res: Response) {
    const auth = req.authContext!;

    const cacheKey = "user-summary";
    const cached = getCached(cacheKey, auth.userId);
    if (cached) return ok(res, cached, 200, "OK");

    const data = await dashboardService.getUserSummary(
      auth.tenantId,
      auth.userId,
    );
    setCached(cacheKey, auth.userId, data);
    return ok(res, data, 200, "OK");
  }

  async getAdminSummary(req: Request, res: Response) {
    const auth = req.authContext!;

    const cacheKey = "admin-summary";
    const cached = getCached(cacheKey, auth.userId);
    if (cached) return ok(res, cached, 200, "OK");

    const data = await dashboardService.getAdminSummary(auth.tenantId);
    setCached(cacheKey, auth.userId, data);
    return ok(res, data, 200, "OK");
  }

  async getSuperAdminSummary(req: Request, res: Response) {
    const auth = req.authContext!;

    const cacheKey = "superadmin-summary";
    const cached = getCached(cacheKey, auth.userId);
    if (cached) return ok(res, cached, 200, "OK");

    const data = await dashboardService.getSuperAdminSummary();
    setCached(cacheKey, auth.userId, data);
    return ok(res, data, 200, "OK");
  }
}

export default new DashboardController();
