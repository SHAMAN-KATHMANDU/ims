/**
 * Platform tenant controller — tenant CRUD, stats, analytics, subscription check.
 */
import { Request, Response } from "express";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { ok, fail } from "@/shared/response";
import * as platformService from "./platform.service";

async function ensureAuth(req: Request, res: Response) {
  const auth = getAuthContext(req);
  if (!auth) {
    fail(res, "Not authenticated", 401);
    return null;
  }
  return auth;
}

export async function createTenant(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const result = await platformService.createTenant(req.body);
  return ok(
    res,
    { tenant: result.tenant, adminUser: result.adminUser },
    201,
    "Tenant created successfully",
  );
}

export async function listTenants(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const tenants = await platformService.listTenants();
  return ok(res, { tenants });
}

export async function getTenant(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const tenant = await platformService.getTenant(req.params.id);
  return ok(res, { tenant });
}

export async function resetTenantUserPassword(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const { tenantId, userId } = req.params;
  await platformService.resetTenantUserPassword(tenantId, userId, req.body);
  return ok(res, undefined, 200, "Password reset successfully");
}

export async function updateTenant(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const tenant = await platformService.updateTenant(req.params.id, req.body);
  return ok(res, { tenant });
}

export async function changePlan(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const tenant = await platformService.changePlan(req.params.id, req.body);
  return ok(res, { tenant }, 200, `Plan changed to ${req.body.plan}`);
}

export async function deactivateTenant(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const tenant = await platformService.deactivateTenant(req.params.id);
  return ok(res, { tenant }, 200, "Tenant deactivated");
}

export async function activateTenant(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const tenant = await platformService.activateTenant(req.params.id);
  return ok(res, { tenant }, 200, "Tenant activated");
}

export async function getStats(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const data = await platformService.getStats();
  return ok(res, data);
}

export async function getAnalytics(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const data = await platformService.getAnalytics();
  return ok(res, data);
}

export async function getTenantDetail(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const result = await platformService.getTenantDetail(req.params.id);
  return ok(res, result);
}

export async function checkSubscriptionExpiry(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const result = await platformService.checkSubscriptionExpiry();
  return ok(res, result, 200, "Subscription expiry check completed");
}

export default {
  createTenant,
  listTenants,
  getTenant,
  resetTenantUserPassword,
  updateTenant,
  changePlan,
  deactivateTenant,
  activateTenant,
  getStats,
  getAnalytics,
  getTenantDetail,
  checkSubscriptionExpiry,
};
