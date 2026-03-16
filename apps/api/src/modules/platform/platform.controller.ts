/**
 * Platform Controller — Thin HTTP layer for platform admin operations.
 * All basePrisma access is in platform.repository; business logic in platform.service.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { sendControllerError } from "@/utils/controllerError";
import platformService from "./platform.service";
import {
  CreateTenantSchema,
  UpdateTenantSchema,
  CreateTenantUserSchema,
  ResetTenantUserPasswordSchema,
  ApprovePlatformResetSchema,
  ChangePlanSchema,
  UpsertPlanLimitSchema,
  CreatePricingPlanSchema,
  UpdatePricingPlanSchema,
  CreateSubscriptionSchema,
  UpdateSubscriptionSchema,
  CreateTenantPaymentSchema,
  UpdateTenantPaymentSchema,
  ListTenantsQuerySchema,
  ListSubscriptionsQuerySchema,
  ListTenantPaymentsQuerySchema,
} from "./platform.schema";
import { ListPasswordResetRequestsQuerySchema } from "@/modules/users/user.schema";

function getParam(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

function handleError(
  req: Request,
  res: Response,
  error: unknown,
  context: string,
) {
  const err = error as { statusCode?: number; message?: string };
  if (err.statusCode === 404) {
    return res.status(404).json({ message: err.message ?? "Not found" });
  }
  if (err.statusCode === 403) {
    return res.status(403).json({ message: err.message ?? "Forbidden" });
  }
  if (err.statusCode === 409) {
    return res.status(409).json({ message: err.message ?? "Conflict" });
  }
  if (err.statusCode === 400) {
    return res.status(400).json({ message: err.message ?? "Bad request" });
  }
  return sendControllerError(req, res, error, context);
}

class PlatformController {
  createTenant = async (req: Request, res: Response) => {
    try {
      const body = CreateTenantSchema.parse(req.body);
      const result = await platformService.createTenant(body);
      return res.status(201).json({
        message: "Tenant created successfully",
        tenant: result.tenant,
        adminUser: result.adminUser,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return handleError(req, res, error, "Create tenant error");
    }
  };

  listTenants = async (req: Request, res: Response) => {
    try {
      const parsed = ListTenantsQuerySchema.safeParse(req.query);
      const data = parsed.success ? parsed.data : undefined;
      const query =
        data && data.page != null && data.limit != null
          ? {
              page: data.page,
              limit: data.limit,
              search: data.search,
              plan: data.plan,
              subscriptionStatus: data.subscriptionStatus,
              isActive: data.isActive,
            }
          : undefined;
      const result = await platformService.findAllTenants(query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return sendControllerError(req, res, error, "List tenants error");
    }
  };

  getTenant = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const tenant = await platformService.findTenantById(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      return res.status(200).json({ tenant });
    } catch (error) {
      return sendControllerError(req, res, error, "Get tenant error");
    }
  };

  createTenantUser = async (req: Request, res: Response) => {
    try {
      const tenantId = getParam(req, "tenantId");
      const body = CreateTenantUserSchema.parse(req.body);
      const user = await platformService.createTenantUser(tenantId, body);
      return res
        .status(201)
        .json({ message: "User created successfully", user });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return handleError(req, res, error, "Create tenant user error");
    }
  };

  resetTenantUserPassword = async (req: Request, res: Response) => {
    try {
      const tenantId = getParam(req, "tenantId");
      const userId = getParam(req, "userId");
      const body = ResetTenantUserPasswordSchema.parse(req.body);
      await platformService.resetTenantUserPassword(tenantId, userId, body);
      return res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return handleError(req, res, error, "Reset tenant user password error");
    }
  };

  updateTenant = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const body = UpdateTenantSchema.parse(req.body);
      const tenant = await platformService.updateTenant(id, body);
      return res.status(200).json({ tenant });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return handleError(req, res, error, "Update tenant error");
    }
  };

  changePlan = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const body = ChangePlanSchema.parse(req.body);
      const tenant = await platformService.changePlan(id, body);
      return res.status(200).json({
        message: `Plan changed to ${body.plan}`,
        tenant,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return handleError(req, res, error, "Change plan error");
    }
  };

  deactivateTenant = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const tenant = await platformService.deactivateTenant(id);
      return res.status(200).json({
        message: "Tenant deactivated",
        tenant,
      });
    } catch (error) {
      return handleError(req, res, error, "Deactivate tenant error");
    }
  };

  activateTenant = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const tenant = await platformService.activateTenant(id);
      return res.status(200).json({
        message: "Tenant activated",
        tenant,
      });
    } catch (error) {
      return handleError(req, res, error, "Activate tenant error");
    }
  };

  getStats = async (req: Request, res: Response) => {
    try {
      const stats = await platformService.getStats();
      return res.status(200).json(stats);
    } catch (error) {
      return sendControllerError(req, res, error, "Platform stats error");
    }
  };

  // ─── Plan Limits ───────────────────────────────────────────────────────────

  listPlanLimits = async (req: Request, res: Response) => {
    try {
      const planLimits = await platformService.listPlanLimits();
      return res.status(200).json({ planLimits });
    } catch (error) {
      return sendControllerError(req, res, error, "List plan limits error");
    }
  };

  getPlanLimit = async (req: Request, res: Response) => {
    try {
      const tier = getParam(req, "tier");
      const validTiers = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          message: `tier must be one of: ${validTiers.join(", ")}`,
        });
      }
      const planLimit = await platformService.getPlanLimitByTier(tier);
      if (!planLimit) {
        return res.status(404).json({ message: "Plan limit not found" });
      }
      return res.status(200).json({ planLimit });
    } catch (error) {
      return sendControllerError(req, res, error, "Get plan limit error");
    }
  };

  upsertPlanLimit = async (req: Request, res: Response) => {
    try {
      const body = UpsertPlanLimitSchema.parse(req.body);
      const planLimit = await platformService.upsertPlanLimit(body);
      return res.status(200).json({
        message: "Plan limit saved successfully",
        planLimit,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return sendControllerError(req, res, error, "Upsert plan limit error");
    }
  };

  deletePlanLimit = async (req: Request, res: Response) => {
    try {
      const tier = getParam(req, "tier");
      const validTiers = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          message: `tier must be one of: ${validTiers.join(", ")}`,
        });
      }
      await platformService.deletePlanLimit(tier);
      return res
        .status(200)
        .json({ message: "Plan limit deleted successfully" });
    } catch (error) {
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Plan limit not found" });
      }
      return sendControllerError(req, res, error, "Delete plan limit error");
    }
  };

  // ─── Pricing Plans ─────────────────────────────────────────────────────────

  listPricingPlans = async (req: Request, res: Response) => {
    try {
      const pricingPlans = await platformService.listPricingPlans();
      return res.status(200).json({ pricingPlans });
    } catch (error) {
      return sendControllerError(req, res, error, "List pricing plans error");
    }
  };

  getPricingPlan = async (req: Request, res: Response) => {
    try {
      const tier = getParam(req, "tier");
      const billingCycle = getParam(req, "billingCycle");
      const validTiers = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      const validCycles = ["MONTHLY", "ANNUAL"];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          message: `tier must be one of: ${validTiers.join(", ")}`,
        });
      }
      if (!validCycles.includes(billingCycle)) {
        return res.status(400).json({
          message: `billingCycle must be one of: ${validCycles.join(", ")}`,
        });
      }
      const pricingPlan = await platformService.getPricingPlanByTierAndCycle(
        tier,
        billingCycle,
      );
      if (!pricingPlan) {
        return res.status(404).json({ message: "Pricing plan not found" });
      }
      return res.status(200).json({ pricingPlan });
    } catch (error) {
      return sendControllerError(req, res, error, "Get pricing plan error");
    }
  };

  createPricingPlan = async (req: Request, res: Response) => {
    try {
      const body = CreatePricingPlanSchema.parse(req.body);
      const pricingPlan = await platformService.createPricingPlan(body);
      return res.status(201).json({
        message: "Pricing plan created successfully",
        pricingPlan,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      const e = error as { code?: string };
      if (e.code === "P2002") {
        return res.status(409).json({
          message:
            "Pricing plan with this tier and billing cycle already exists",
        });
      }
      return sendControllerError(req, res, error, "Create pricing plan error");
    }
  };

  updatePricingPlan = async (req: Request, res: Response) => {
    try {
      const tier = getParam(req, "tier");
      const billingCycle = getParam(req, "billingCycle");
      const body = UpdatePricingPlanSchema.parse(req.body);
      const pricingPlan = await platformService.updatePricingPlan(
        tier,
        billingCycle,
        body,
      );
      return res.status(200).json({
        message: "Pricing plan updated successfully",
        pricingPlan,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Pricing plan not found" });
      }
      return sendControllerError(req, res, error, "Update pricing plan error");
    }
  };

  deletePricingPlan = async (req: Request, res: Response) => {
    try {
      const tier = getParam(req, "tier");
      const billingCycle = getParam(req, "billingCycle");
      const validTiers = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];
      const validCycles = ["MONTHLY", "ANNUAL"];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({
          message: `tier must be one of: ${validTiers.join(", ")}`,
        });
      }
      if (!validCycles.includes(billingCycle)) {
        return res.status(400).json({
          message: `billingCycle must be one of: ${validCycles.join(", ")}`,
        });
      }
      await platformService.deletePricingPlan(tier, billingCycle);
      return res
        .status(200)
        .json({ message: "Pricing plan deleted successfully" });
    } catch (error) {
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Pricing plan not found" });
      }
      return sendControllerError(req, res, error, "Delete pricing plan error");
    }
  };

  // ─── Subscriptions ─────────────────────────────────────────────────────────

  listSubscriptions = async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const parsed = ListSubscriptionsQuerySchema.safeParse(req.query);
      const query =
        parsed.success &&
        parsed.data &&
        parsed.data.page != null &&
        parsed.data.limit != null
          ? { page: parsed.data.page, limit: parsed.data.limit }
          : undefined;
      const result = await platformService.listSubscriptions(tenantId, query);
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return sendControllerError(req, res, error, "List subscriptions error");
    }
  };

  getSubscription = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const subscription = await platformService.getSubscriptionById(id);
      if (!subscription) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      return res.status(200).json({ subscription });
    } catch (error) {
      return sendControllerError(req, res, error, "Get subscription error");
    }
  };

  createSubscription = async (req: Request, res: Response) => {
    try {
      const body = CreateSubscriptionSchema.parse(req.body);
      const subscription = await platformService.createSubscription(body);
      return res.status(201).json({
        message: "Subscription created successfully",
        subscription,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return handleError(req, res, error, "Create subscription error");
    }
  };

  updateSubscription = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const body = UpdateSubscriptionSchema.parse(req.body);
      const subscription = await platformService.updateSubscription(id, body);
      return res.status(200).json({
        message: "Subscription updated successfully",
        subscription,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Subscription not found" });
      }
      return sendControllerError(req, res, error, "Update subscription error");
    }
  };

  deleteSubscription = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      await platformService.deleteSubscription(id);
      return res
        .status(200)
        .json({ message: "Subscription deleted successfully" });
    } catch (error) {
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Subscription not found" });
      }
      return sendControllerError(req, res, error, "Delete subscription error");
    }
  };

  // ─── Tenant Payments ───────────────────────────────────────────────────────

  listTenantPayments = async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const subscriptionId = req.query.subscriptionId as string | undefined;
      const parsed = ListTenantPaymentsQuerySchema.safeParse(req.query);
      const query =
        parsed.success &&
        parsed.data &&
        parsed.data.page != null &&
        parsed.data.limit != null
          ? { page: parsed.data.page, limit: parsed.data.limit }
          : undefined;
      const result = await platformService.listTenantPayments(
        tenantId,
        subscriptionId,
        query,
      );
      return res.status(200).json({ message: "OK", ...result });
    } catch (error) {
      return sendControllerError(req, res, error, "List tenant payments error");
    }
  };

  getTenantPayment = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const payment = await platformService.getTenantPaymentById(id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      return res.status(200).json({ payment });
    } catch (error) {
      return sendControllerError(req, res, error, "Get tenant payment error");
    }
  };

  createTenantPayment = async (req: Request, res: Response) => {
    try {
      const body = CreateTenantPaymentSchema.parse(req.body);
      const payment = await platformService.createTenantPayment(body);
      return res.status(201).json({
        message: "Payment created successfully",
        payment,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return handleError(req, res, error, "Create tenant payment error");
    }
  };

  updateTenantPayment = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      const body = UpdateTenantPaymentSchema.parse(req.body);
      const payment = await platformService.updateTenantPayment(id, body);
      return res.status(200).json({
        message: "Payment updated successfully",
        payment,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Payment not found" });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Update tenant payment error",
      );
    }
  };

  deleteTenantPayment = async (req: Request, res: Response) => {
    try {
      const id = getParam(req, "id");
      await platformService.deleteTenantPayment(id);
      return res.status(200).json({ message: "Payment deleted successfully" });
    } catch (error) {
      const e = error as { code?: string };
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Payment not found" });
      }
      return sendControllerError(
        req,
        res,
        error,
        "Delete tenant payment error",
      );
    }
  };

  // ─── Password Reset Requests (escalated) ───────────────────────────────────

  getPlatformResetRequests = async (req: Request, res: Response) => {
    try {
      const parsed = ListPasswordResetRequestsQuerySchema.safeParse(req.query);
      const data = parsed.success ? parsed.data : undefined;
      const query =
        data && data.page != null && data.limit != null
          ? {
              page: data.page,
              limit: data.limit,
              search: data.search,
            }
          : undefined;
      const result = await platformService.getPlatformResetRequests(query);
      return res.status(200).json({
        message: "Password reset requests fetched",
        ...result,
      });
    } catch (error) {
      return sendControllerError(
        req,
        res,
        error,
        "Get platform reset requests error",
      );
    }
  };

  approvePlatformResetRequest = async (req: Request, res: Response) => {
    try {
      const requestId = getParam(req, "requestId");
      const handledById = req.user!.id;
      const body = ApprovePlatformResetSchema.parse(req.body);
      await platformService.approvePlatformResetRequest(
        requestId,
        handledById,
        {
          newPassword: body.newPassword,
        },
      );
      return res
        .status(200)
        .json({ message: "Password reset approved. User can now log in." });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: error.errors[0]?.message ?? "Validation error",
        });
      }
      return handleError(
        req,
        res,
        error,
        "Approve platform reset request error",
      );
    }
  };
}

export default new PlatformController();
