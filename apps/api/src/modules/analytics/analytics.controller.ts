import { Request, Response } from "express";
import { getTenantId } from "@/config/tenantContext";
import { sendControllerError } from "@/utils/controllerError";
import analyticsService from "./analytics.service";

interface AuthUser {
  id?: string;
  tenantId?: string;
  role?: string;
  tenantSlug?: string;
}

function getAuthFromReq(req: Request): {
  role: string | undefined;
  currentUserId: string | undefined;
  tenantId: string | null;
} {
  const user = (req as Request & { user?: AuthUser }).user;
  return {
    role: user?.role,
    currentUserId: user?.id,
    tenantId: user?.tenantId ?? getTenantId(),
  };
}

class AnalyticsController {
  constructor(private service: typeof analyticsService) {}

  getOverview = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthFromReq(req);
      const analytics = await this.service.getOverview(tenantId);
      return res.status(200).json({
        message: "Analytics fetched successfully",
        analytics,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get analytics error");
    }
  };

  getSalesRevenue = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId, tenantId } = getAuthFromReq(req);
      const data = await this.service.getSalesRevenue(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
        tenantId,
      );
      return res.status(200).json({
        message: "Sales revenue analytics fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get sales revenue analytics error",
      );
    }
  };

  getInventoryOps = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthFromReq(req);
      const data = await this.service.getInventoryOps(
        req.query as Record<string, unknown>,
        tenantId,
      );
      return res.status(200).json({
        message: "Inventory ops analytics fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get inventory ops error");
    }
  };

  getCustomersPromos = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId, tenantId } = getAuthFromReq(req);
      const data = await this.service.getCustomersPromos(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
        tenantId,
      );
      return res.status(200).json({
        message: "Customers promos analytics fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get customers promos error");
    }
  };

  getDiscountAnalytics = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId } = getAuthFromReq(req);
      const data = await this.service.getDiscountAnalytics(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
      );
      return res.status(200).json({
        message: "Discount analytics fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get discount analytics error",
      );
    }
  };

  getPaymentTrends = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId, tenantId } = getAuthFromReq(req);
      const data = await this.service.getPaymentTrends(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
        tenantId,
      );
      return res.status(200).json({
        message: "Payment trends fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get payment trends error");
    }
  };

  getLocationComparison = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId } = getAuthFromReq(req);
      const data = await this.service.getLocationComparison(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
      );
      return res.status(200).json({
        message: "Location comparison fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get location comparison error",
      );
    }
  };

  getSalesExtended = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId } = getAuthFromReq(req);
      const data = await this.service.getSalesExtended(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
      );
      return res.status(200).json({
        message: "Sales extended analytics fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get sales extended error");
    }
  };

  getProductInsights = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId, tenantId } = getAuthFromReq(req);
      const data = await this.service.getProductInsights(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
        tenantId,
      );
      return res.status(200).json({
        message: "Product insights fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get product insights error");
    }
  };

  getInventoryExtended = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId, tenantId } = getAuthFromReq(req);
      const data = await this.service.getInventoryExtended(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
        tenantId,
      );
      return res.status(200).json({
        message: "Inventory extended analytics fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get inventory extended error",
      );
    }
  };

  getCustomerInsights = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId } = getAuthFromReq(req);
      const data = await this.service.getCustomerInsights(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
      );
      return res.status(200).json({
        message: "Customer insights fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(
        req,
        res,
        error,
        "Get customer insights error",
      );
    }
  };

  getTrends = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId } = getAuthFromReq(req);
      const data = await this.service.getTrends(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
      );
      return res.status(200).json({
        message: "Trends analytics fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get trends error");
    }
  };

  getFinancial = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId, tenantId } = getAuthFromReq(req);
      const data = await this.service.getFinancial(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
        tenantId,
      );
      return res.status(200).json({
        message: "Financial analytics fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get financial error");
    }
  };

  getMemberCohort = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId } = getAuthFromReq(req);
      const data = await this.service.getMemberCohort(
        req.query as Record<string, unknown>,
        role,
        currentUserId,
      );
      return res.status(200).json({
        message: "Member cohort fetched",
        data,
      });
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Get member cohort error");
    }
  };

  exportAnalytics = async (req: Request, res: Response) => {
    try {
      const { role, currentUserId, tenantId } = getAuthFromReq(req);
      const exportType = (req.query.type as string) || "";
      const format = (req.query.format as string) || "csv";

      const result = await this.service.exportAnalytics(
        req.query as Record<string, unknown>,
        exportType,
        format,
        role,
        currentUserId,
        tenantId,
      );

      if (result.type === "error") {
        return res.status(400).json({ message: result.message });
      }

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      );
      res.setHeader("Content-Type", result.contentType);

      if (result.type === "buffer") {
        return res.send(result.buffer);
      }
      return res.send(result.csv);
    } catch (error: unknown) {
      return sendControllerError(req, res, error, "Export analytics error");
    }
  };
}

export default new AnalyticsController(analyticsService);
