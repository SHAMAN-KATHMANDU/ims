/**
 * Platform controller — re-exports from tenant, plans, and billing modules.
 * Each sub-module stays under 300 lines.
 */
import platformTenant from "./platform.tenant.controller";
import platformPlans from "./platform.plans.controller";
import platformBilling from "./platform.billing.controller";

export default {
  ...platformTenant,
  ...platformPlans,
  ...platformBilling,
};
