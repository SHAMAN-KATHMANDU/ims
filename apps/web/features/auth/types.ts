/**
 * Auth feature types.
 * AuthUser and TenantInfo are shared and live in utils/auth.
 */

import type { AuthUser, TenantInfo } from "@/utils/auth";

export type { AuthUser, TenantInfo };

export interface LoginCredentials {
  username: string;
  password: string;
  tenantSlug?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  tenant: TenantInfo;
}

export interface LoginFormValues {
  username: string;
  password: string;
}
