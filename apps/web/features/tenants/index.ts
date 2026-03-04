export { TenantsPage } from "./components/index";
export { NewTenantPage } from "./components/NewTenantPage";
export { EditTenantPage } from "./components/EditTenantPage";
export {
  useTenants,
  useTenant,
  useCreateTenant,
  useUpdateTenant,
  useChangeTenantPlan,
  useActivateTenant,
  useDeactivateTenant,
  useCreateTenantUser,
  useResetTenantUserPassword,
  tenantKeys,
} from "./hooks/use-tenants";
export type {
  Tenant,
  CreateTenantData,
  UpdateTenantData,
  CreateTenantUserData,
  PlanTier,
  SubscriptionStatus,
} from "./hooks/use-tenants";
export {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  changeTenantPlan,
  activateTenant,
  deactivateTenant,
  createTenantUser,
  resetTenantUserPassword,
  getPlatformStats,
} from "./services/tenant.service";
export type { PlatformStats } from "./services/tenant.service";
