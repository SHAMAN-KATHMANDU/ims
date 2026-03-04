/**
 * Plan Limits Service — Platform admin CRUD for default plan limits (per tier).
 * All requests go to /platform/plan-limits and require platformAdmin role.
 */

import api from "@/lib/axios";
import { handleApiError } from "@/lib/api-error";

export type PlanTier = "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

export interface PlanLimit {
  id: string;
  tier: PlanTier;
  maxUsers: number;
  maxProducts: number;
  maxLocations: number;
  maxMembers: number;
  maxCustomers: number;
  bulkUpload: boolean;
  analytics: boolean;
  promoManagement: boolean;
  auditLogs: boolean;
  apiAccess: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertPlanLimitData {
  maxUsers?: number;
  maxProducts?: number;
  maxLocations?: number;
  maxMembers?: number;
  maxCustomers?: number;
  bulkUpload?: boolean;
  analytics?: boolean;
  promoManagement?: boolean;
  auditLogs?: boolean;
  apiAccess?: boolean;
}

interface ListPlanLimitsResponse {
  planLimits: PlanLimit[];
}

interface PlanLimitResponse {
  planLimit: PlanLimit;
}

export async function getPlanLimits(): Promise<PlanLimit[]> {
  try {
    const response = await api.get<ListPlanLimitsResponse>(
      "/platform/plan-limits",
    );
    return response.data.planLimits ?? [];
  } catch (error) {
    handleApiError(error, "fetch plan limits");
    throw error;
  }
}

export async function getPlanLimitByTier(
  tier: PlanTier,
): Promise<PlanLimit | null> {
  try {
    const response = await api.get<PlanLimitResponse>(
      `/platform/plan-limits/${tier}`,
    );
    return response.data.planLimit ?? null;
  } catch (error: unknown) {
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 404) return null;
    handleApiError(error, `fetch plan limit ${tier}`);
    throw error;
  }
}

export async function upsertPlanLimit(
  tier: PlanTier,
  data: UpsertPlanLimitData,
): Promise<PlanLimit> {
  try {
    const response = await api.put<PlanLimitResponse>(
      `/platform/plan-limits/${tier}`,
      { tier, ...data },
    );
    return response.data.planLimit;
  } catch (error) {
    handleApiError(error, `save plan limit ${tier}`);
    throw error;
  }
}
