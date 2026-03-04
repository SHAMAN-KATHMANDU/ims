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
