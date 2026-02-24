/**
 * Analytics service: barrel re-export.
 * All sale-based reports merge tenantId into where for multi-tenant safety.
 */

export { getOverview } from "./analytics.service.overview";
export { getSalesRevenue, getSalesExtended } from "./analytics.service.sales";
export {
  getInventoryOps,
  getInventoryExtended,
} from "./analytics.service.inventory";
export {
  getCustomersPromos,
  getMemberCohort,
  getCustomerInsights,
} from "./analytics.service.customers";
export {
  getDiscountAnalytics,
  getPaymentTrends,
  getFinancial,
} from "./analytics.service.discounts";
export {
  getLocationComparison,
  getProductInsights,
} from "./analytics.service.location";
export { getTrends } from "./analytics.service.trends";
export type { ExportResult } from "./analytics.service.export";
export { exportAnalytics } from "./analytics.service.export";
