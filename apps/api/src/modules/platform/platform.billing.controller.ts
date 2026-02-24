/**
 * Platform billing controller — pricing plans, subscriptions, payments, add-ons.
 */
import { Request, Response } from "express";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { ok, fail } from "@/shared/response";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import * as platformService from "./platform.service";

async function ensureAuth(req: Request, res: Response) {
  const auth = getAuthContext(req);
  if (!auth) {
    fail(res, "Not authenticated", 401);
    return null;
  }
  return auth;
}

export async function listPricingPlans(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const pricingPlans = await platformService.listPricingPlans();
  return ok(res, { pricingPlans });
}

export async function initializeDefaultPricingPlans(
  req: Request,
  res: Response,
) {
  if (!(await ensureAuth(req, res))) return;
  const pricingPlans = await platformService.initializeDefaultPricingPlans();
  return ok(res, { pricingPlans }, 200, "Default pricing plans initialized");
}

export async function getPricingPlan(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const { tier, billingCycle } = req.params;
  const pricingPlan = await platformService.getPricingPlan(tier, billingCycle);
  return ok(res, { pricingPlan });
}

export async function createPricingPlan(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const pricingPlan = await platformService.createPricingPlan(req.body);
  return ok(res, { pricingPlan }, 201, "Pricing plan created successfully");
}

export async function updatePricingPlan(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const { tier, billingCycle } = req.params;
  const pricingPlan = await platformService.updatePricingPlan(
    tier,
    billingCycle,
    req.body,
  );
  return ok(res, { pricingPlan }, 200, "Pricing plan updated successfully");
}

export async function deletePricingPlan(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const { tier, billingCycle } = req.params;
  await platformService.deletePricingPlan(tier, billingCycle);
  return ok(res, undefined, 200, "Pricing plan deleted successfully");
}

export async function listSubscriptions(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const { tenantId } = getValidatedQuery<{ tenantId?: string }>(req, res);
  const subscriptions = await platformService.listSubscriptions(tenantId);
  return ok(res, { subscriptions });
}

export async function getSubscription(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const subscription = await platformService.getSubscription(req.params.id);
  return ok(res, { subscription });
}

export async function createSubscription(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const subscription = await platformService.createSubscription(req.body);
  return ok(res, { subscription }, 201, "Subscription created successfully");
}

export async function updateSubscription(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const subscription = await platformService.updateSubscription(
    req.params.id,
    req.body,
  );
  return ok(res, { subscription }, 200, "Subscription updated successfully");
}

export async function deleteSubscription(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  await platformService.deleteSubscription(req.params.id);
  return ok(res, undefined, 200, "Subscription deleted successfully");
}

export async function listTenantPayments(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const { tenantId, subscriptionId } = getValidatedQuery<{
    tenantId?: string;
    subscriptionId?: string;
  }>(req, res);
  const payments = await platformService.listTenantPayments({
    tenantId,
    subscriptionId,
  });
  return ok(res, { payments });
}

export async function getTenantPayment(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const payment = await platformService.getTenantPayment(req.params.id);
  return ok(res, { payment });
}

export async function createTenantPayment(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const payment = await platformService.createTenantPayment(req.body);
  return ok(res, { payment }, 201, "Payment created successfully");
}

export async function updateTenantPayment(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const payment = await platformService.updateTenantPayment(
    req.params.id,
    req.body,
  );
  return ok(res, { payment }, 200, "Payment updated successfully");
}

export async function deleteTenantPayment(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  await platformService.deleteTenantPayment(req.params.id);
  return ok(res, undefined, 200, "Payment deleted successfully");
}

export async function listAddOnPricing(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const pricing = await platformService.listAddOnPricing();
  return ok(res, { pricing });
}

export async function getAddOnPricing(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const pricing = await platformService.getAddOnPricing(req.params.id);
  return ok(res, { pricing });
}

export async function createAddOnPricing(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const pricing = await platformService.createAddOnPricing(req.body);
  return ok(res, { pricing }, 201, "Add-on pricing created successfully");
}

export async function updateAddOnPricing(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const pricing = await platformService.updateAddOnPricing(
    req.params.id,
    req.body,
  );
  return ok(res, { pricing }, 200, "Add-on pricing updated successfully");
}

export async function deleteAddOnPricing(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  await platformService.deleteAddOnPricing(req.params.id);
  return ok(res, undefined, 200, "Add-on pricing deleted successfully");
}

export async function listTenantAddOns(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const { tenantId, status } = getValidatedQuery<{
    tenantId?: string;
    status?: string;
  }>(req, res);
  const addOns = await platformService.listTenantAddOns({ tenantId, status });
  return ok(res, { addOns });
}

export async function getTenantAddOn(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const addOn = await platformService.getTenantAddOn(req.params.id);
  return ok(res, { addOn });
}

export async function createTenantAddOn(req: Request, res: Response) {
  const auth = await ensureAuth(req, res);
  if (!auth) return;
  const addOn = await platformService.createTenantAddOn(req.body, auth.userId);
  return ok(res, { addOn }, 201, "Tenant add-on created successfully");
}

export async function updateTenantAddOn(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const addOn = await platformService.updateTenantAddOn(
    req.params.id,
    req.body,
  );
  return ok(res, { addOn }, 200, "Tenant add-on updated successfully");
}

export async function approveTenantAddOn(req: Request, res: Response) {
  const auth = await ensureAuth(req, res);
  if (!auth) return;
  const addOn = await platformService.approveTenantAddOn(
    req.params.id,
    auth.userId,
  );
  return ok(res, { addOn }, 200, "Tenant add-on approved successfully");
}

export async function cancelTenantAddOn(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const addOn = await platformService.cancelTenantAddOn(req.params.id);
  return ok(res, { addOn }, 200, "Tenant add-on cancelled successfully");
}

export async function deleteTenantAddOn(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  await platformService.deleteTenantAddOn(req.params.id);
  return ok(res, undefined, 200, "Tenant add-on deleted successfully");
}

export default {
  listPricingPlans,
  initializeDefaultPricingPlans,
  getPricingPlan,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  listSubscriptions,
  getSubscription,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  listTenantPayments,
  getTenantPayment,
  createTenantPayment,
  updateTenantPayment,
  deleteTenantPayment,
  listAddOnPricing,
  getAddOnPricing,
  createAddOnPricing,
  updateAddOnPricing,
  deleteAddOnPricing,
  listTenantAddOns,
  getTenantAddOn,
  createTenantAddOn,
  updateTenantAddOn,
  approveTenantAddOn,
  cancelTenantAddOn,
  deleteTenantAddOn,
};
