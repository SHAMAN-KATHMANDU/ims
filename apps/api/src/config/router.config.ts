/**
 * Route registration is the single source of truth; do not maintain a separate list of paths here.
 *
 * Middleware chain (applied globally to all routes below /auth):
 *   verifyToken → resolveTenant → checkSubscription → [route handler]
 *
 * Only /auth routes are exempt (they manage their own auth).
 * Platform admin routes go through the same chain but checkSubscription
 * bypasses enforcement for the platformAdmin role.
 */

import { Request, Response, Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import resolveTenant from "@/middlewares/tenantMiddleware";
import checkSubscription from "@/middlewares/subscriptionMiddleware";
import authRouter from "@/modules/auth/auth.router";
import userRouter from "@/modules/users/user.router";
import productRouter from "@/modules/products/product.router";
import categoryRouter from "@/modules/categories/category.router";
import attributeTypeRouter from "@/modules/attribute-types/attribute-type.router";
import vendorRouter from "@/modules/vendors/vendor.router";
import locationRouter from "@/modules/locations/location.router";
import inventoryRouter from "@/modules/inventory/inventory.router";
import transferRouter from "@/modules/transfers/transfer.router";
import memberRouter from "@/modules/members/member.router";
import saleRouter from "@/modules/sales/sale.router";
import promoRouter from "@/modules/promos/promo.router";
import auditRouter from "@/modules/audit/audit.router";
import errorReportRouter from "@/modules/error-reports/error-report.router";
import analyticsRouter from "@/modules/analytics/analytics.router";
import dashboardRouter from "@/modules/dashboard/dashboard.router";
import { getVersion } from "@/config/version";
import bulkRouter from "@/modules/bulk/bulk.router";
import platformRouter from "@/modules/platform/platform.router";
import companyRouter from "@/modules/companies/company.router";
import contactRouter from "@/modules/contacts/contact.router";
import leadRouter from "@/modules/leads/lead.router";
import pipelineRouter from "@/modules/pipelines/pipeline.router";
import dealRouter from "@/modules/deals/deal.router";
import taskRouter from "@/modules/tasks/task.router";
import activityRouter from "@/modules/activities/activity.router";
import notificationRouter from "@/modules/notifications/notification.router";
import crmRouter from "@/modules/crm/crm.router";
import trashRouter from "@/modules/trash/trash.router";
import crmSettingsRouter from "@/modules/crm-settings/crm-settings.router";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "API is running",
    version: getVersion(),
  });
});

// ============================================
// Auth routes (no tenant middleware; tenant from X-Tenant-Slug)
// ============================================
router.use("/auth", authRouter);

// ============================================
// Tenant-scoped routes
// All routes below require: auth → tenant resolution → subscription check
// ============================================
router.use(verifyToken, resolveTenant, checkSubscription);

router.use("/platform", platformRouter);
router.use("/users", userRouter);
router.use("/products", productRouter);
router.use("/categories", categoryRouter);
router.use("/attribute-types", attributeTypeRouter);
router.use("/vendors", vendorRouter);
router.use("/locations", locationRouter);
router.use("/inventory", inventoryRouter);
router.use("/transfers", transferRouter);
router.use("/members", memberRouter);
router.use("/sales", saleRouter);
router.use("/promos", promoRouter);
router.use("/audit-logs", auditRouter);
router.use("/error-reports", errorReportRouter);
router.use("/analytics", analyticsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/bulk", bulkRouter);
router.use("/companies", companyRouter);
router.use("/contacts", contactRouter);
router.use("/leads", leadRouter);
router.use("/pipelines", pipelineRouter);
router.use("/deals", dealRouter);
router.use("/tasks", taskRouter);
router.use("/activities", activityRouter);
router.use("/notifications", notificationRouter);
router.use("/crm", crmRouter);
router.use("/crm-settings", crmSettingsRouter);
router.use("/trash", trashRouter);

export default router;
