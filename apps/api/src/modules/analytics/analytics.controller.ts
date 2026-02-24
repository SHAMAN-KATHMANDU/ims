import { Request, Response } from "express";
import { ok } from "@/shared/response";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import * as analyticsService from "./analytics.service";

class AnalyticsController {
  async getOverview(req: Request, res: Response) {
    const auth = req.authContext!;
    const result = await analyticsService.getOverview(auth.tenantId);
    return ok(res, result, 200, "Analytics fetched successfully");
  }

  async getSalesRevenue(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getSalesRevenue(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    return ok(res, result.data, 200, "Sales revenue analytics fetched");
  }

  async getInventoryOps(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getInventoryOps(auth.tenantId, query);
    return ok(res, result.data, 200, "Inventory ops analytics fetched");
  }

  async getCustomersPromos(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getCustomersPromos(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    return ok(res, result.data, 200, "Customers promos analytics fetched");
  }

  async getDiscountAnalytics(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getDiscountAnalytics(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    return ok(res, result.data, 200, "Discount analytics fetched");
  }

  async getPaymentTrends(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getPaymentTrends(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    return ok(res, result.data, 200, "Payment trends fetched");
  }

  async getLocationComparison(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getLocationComparison(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    return ok(res, result.data, 200, "Location comparison fetched");
  }

  async getSalesExtended(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getSalesExtended(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    return ok(res, result.data, 200, "Sales extended analytics fetched");
  }

  async getProductInsights(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getProductInsights(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    return ok(res, result.data, 200, "Product insights fetched");
  }

  async getInventoryExtended(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getInventoryExtended(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    return ok(res, result.data, 200, "Inventory extended analytics fetched");
  }

  async getCustomerInsights(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getCustomerInsights(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    return ok(res, result.data, 200, "Customer insights fetched");
  }

  async getTrends(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getTrends(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    return ok(res, result.data, 200, "Trends analytics fetched");
  }

  async getFinancial(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getFinancial(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    return ok(res, result.data, 200, "Financial analytics fetched");
  }

  async getMemberCohort(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.getMemberCohort(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    return ok(res, result.data, 200, "Member cohort fetched");
  }

  async exportAnalytics(req: Request, res: Response) {
    const auth = req.authContext!;
    const query = getValidatedQuery<Record<string, unknown>>(req, res);
    const result = await analyticsService.exportAnalytics(
      auth.tenantId,
      auth.role,
      auth.userId,
      query,
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${result.filename}"`,
    );
    res.setHeader("Content-Type", result.contentType);
    if (result.type === "buffer") {
      return res.send(result.buffer);
    }
    return res.send(result.csv);
  }
}

export default new AnalyticsController();
