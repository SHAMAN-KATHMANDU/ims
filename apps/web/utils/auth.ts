/**
 * Auth Types
 *
 * Type definitions for authentication.
 * State management is handled by stores/auth-store.ts (Zustand).
 */

export type UserRole = "platformAdmin" | "superAdmin" | "admin" | "user";

export interface AuthUser {
  id: string;
  tenantId: string;
  username: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  plan: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  subscriptionStatus:
    | "TRIAL"
    | "ACTIVE"
    | "PAST_DUE"
    | "SUSPENDED"
    | "LOCKED"
    | "CANCELLED";
  planExpiresAt: string | null;
  trialEndsAt: string | null;
}
