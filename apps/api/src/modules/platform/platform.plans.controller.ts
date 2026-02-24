/**
 * Platform plans controller — plan registry and plan limits.
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

export async function listPlans(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const plans = await platformService.listPlans();
  return ok(res, { plans });
}

export async function getPlan(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const plan = await platformService.getPlan(req.params.id);
  return ok(res, { plan });
}

export async function createPlan(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const plan = await platformService.createPlan(req.body);
  return ok(res, { plan }, 201, "Plan created successfully");
}

export async function updatePlan(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const plan = await platformService.updatePlan(req.params.id, req.body);
  return ok(res, { plan }, 200, "Plan updated successfully");
}

export async function deletePlan(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  await platformService.deletePlan(req.params.id);
  return ok(res, undefined, 200, "Plan deactivated successfully");
}

export async function listPlanLimits(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const planLimits = await platformService.listPlanLimits();
  return ok(res, { planLimits });
}

export async function getPlanLimit(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const planLimit = await platformService.getPlanLimit(req.params.tier);
  return ok(res, { planLimit });
}

export async function upsertPlanLimit(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  const tier = req.body.tier ?? req.params.tier;
  if (!tier) return fail(res, "tier is required", 400);
  const planLimit = await platformService.upsertPlanLimit(tier, req.body);
  return ok(res, { planLimit }, 200, "Plan limit saved successfully");
}

export async function deletePlanLimit(req: Request, res: Response) {
  if (!(await ensureAuth(req, res))) return;
  await platformService.deletePlanLimit(req.params.tier);
  return ok(res, undefined, 200, "Plan limit deleted successfully");
}

export default {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  listPlanLimits,
  getPlanLimit,
  upsertPlanLimit,
  deletePlanLimit,
};
