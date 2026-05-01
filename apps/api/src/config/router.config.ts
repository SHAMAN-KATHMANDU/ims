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
import crmSettingsRouter from "@/modules/crm-settings/crm-settings.router";
import workflowRouter from "@/modules/workflows/workflow.router";
import automationRouter from "@/modules/automation/automation.router";
import webhookRouter from "@/modules/webhooks/webhook.router";
import messagingChannelRouter from "@/modules/messaging-channels/messaging-channel.router";
import messagingRouter from "@/modules/messaging/messaging.router";
import trashRouter from "@/modules/trash/trash.router";
import tenantSettingsRouter from "@/modules/tenant-settings/tenant-settings.router";
import sitesRouter from "@/modules/sites/sites.router";
import publicSiteRouter from "@/modules/public-site/public-site.router";
import publicBlogRouter from "@/modules/public-blog/public-blog.router";
import blogRouter from "@/modules/blog/blog.router";
import pagesRouter from "@/modules/pages/pages.router";
import publicPagesRouter from "@/modules/public-pages/public-pages.router";
import websiteOrdersRouter from "@/modules/website-orders/website-orders.router";
import publicOrdersRouter from "@/modules/public-orders/public-orders.router";
import publicCartPingsRouter from "@/modules/public-cart-pings/public-cart-pings.router";
import publicPagePreviewRouter from "@/modules/public-page-preview/public-page-preview.router";
import publicSitePreviewRouter from "@/modules/public-site-preview/public-site-preview.router";
import siteLayoutsRouter from "@/modules/site-layouts/site-layouts.router";
import publicSiteLayoutsRouter from "@/modules/site-layouts/public-site-layouts.router";
import navMenusRouter from "@/modules/nav-menus/nav-menus.router";
import publicNavMenusRouter from "@/modules/nav-menus/public-nav-menus.router";
import collectionsRouter from "@/modules/collections/collections.router";
import reviewsRouter from "@/modules/reviews/reviews.router";
import publicFormSubmissionsRouter from "@/modules/public-form-submissions/public-form-submissions.router";
import internalRouter from "@/modules/internal/internal.router";
import aiSettingsRouter from "@/modules/ai-settings/ai-settings.router";
import mediaRouter from "@/modules/media/media.router";
import bundleRouter, {
  publicBundleRouter,
} from "@/modules/bundles/bundle.router";
import giftCardRouter, {
  publicGiftCardRouter,
} from "@/modules/gift-cards/gift-card.router";
import permissionsRouter from "@/modules/permissions/permissions.router";
import tenantRouter from "@/modules/tenants/tenant.router";
import businessProfileRouter from "@/modules/business-profile/business-profile.router";
import publicApiKeysRouter from "@/modules/public-api-keys/public-api-keys.router";
import publicDataApiRouter from "@/modules/public-data-api/public-data-api.router";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "API is running",
    version: getVersion(),
  });
});

// ============================================
// Webhook routes (no auth — signature verification only)
// ============================================
router.use("/webhooks", webhookRouter);

// ============================================
// Auth routes (no tenant middleware; tenant from X-Tenant-Slug)
// ============================================
router.use("/auth", authRouter);

// ============================================
// Public website routes (no JWT; tenant resolved from Host header)
//
// /public/preview/page is mounted FIRST because tenant context for that
// route comes from the HMAC-signed token, not the Host header. The
// publicSiteRouter (mounted at /public) applies resolveTenantFromHostname
// as router-level middleware, so any /public/* request whose Host header
// doesn't map to a known tenant 404s before reaching the next mount.
// Putting the preview route first lets express match it directly without
// passing through hostname resolution.
// ============================================
router.use("/public/preview/page", publicPagePreviewRouter);
router.use("/public/preview/site", publicSitePreviewRouter);

// ============================================
// Public Data API (no JWT; tenant resolved from API key + Origin pinning)
// Mounted BEFORE the hostname-based public surface so /public/v1/* never
// falls through to resolveTenantFromHostname.
// ============================================
router.use("/public/v1", publicDataApiRouter);

router.use("/public", publicSiteRouter);
router.use("/public/blog", publicBlogRouter);
router.use("/public/pages", publicPagesRouter);
router.use("/public/site-layouts", publicSiteLayoutsRouter);
router.use("/public/nav-menus", publicNavMenusRouter);
router.use("/public/orders", publicOrdersRouter);
router.use("/public/cart-pings", publicCartPingsRouter);
router.use("/public/form-submissions", publicFormSubmissionsRouter);
router.use("/public/bundles", publicBundleRouter);
router.use("/public/gift-cards", publicGiftCardRouter);

// ============================================
// Internal server-to-server hooks (no JWT; shared-secret token)
// Used by Caddy on_demand_tls and the tenant-site Next.js renderer.
// ============================================
router.use("/internal", internalRouter);

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
router.use("/tenant-settings", tenantSettingsRouter);
router.use("/tenants", businessProfileRouter);
router.use("/sites", sitesRouter);
router.use("/blog", blogRouter);
router.use("/pages", pagesRouter);
router.use("/site-layouts", siteLayoutsRouter);
router.use("/nav-menus", navMenusRouter);
router.use("/collections", collectionsRouter);
router.use("/reviews", reviewsRouter);
router.use("/website-orders", websiteOrdersRouter);
router.use("/workflows", workflowRouter);
router.use("/automation", automationRouter);
router.use("/trash", trashRouter);
router.use("/messaging-channels", messagingChannelRouter);
router.use("/messaging", messagingRouter);
router.use("/ai-settings", aiSettingsRouter);
router.use("/media", mediaRouter);
router.use("/bundles", bundleRouter);
router.use("/gift-cards", giftCardRouter);
router.use("/permissions", permissionsRouter);
router.use("/roles", permissionsRouter);
router.use("/tenants", tenantRouter);
router.use("/public-api-keys", publicApiKeysRouter);

export default router;
