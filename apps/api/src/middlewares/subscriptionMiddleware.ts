/**
 * Subscription Status Middleware
 *
 * Enforces access control based on the tenant's subscription status.
 * Must run AFTER resolveTenant middleware.
 *
 * Access rules:
 *   TRIAL / ACTIVE   → Full access (within plan limits)
 *   PAST_DUE         → Full access + warning headers
 *   SUSPENDED        → Read-only (GET allowed, writes blocked)
 *   LOCKED           → All access blocked (except subscription routes)
 *   CANCELLED        → All access blocked
 */

import { Request, Response, NextFunction } from "express";
import { getAuthContext } from "@/shared/auth/getAuthContext";

const checkSubscription = (req: Request, res: Response, next: NextFunction) => {
  const tenant = req.tenant;

  // Platform admins and unauthenticated routes bypass subscription checks
  if (
    !tenant ||
    (req.authContext ?? getAuthContext(req))?.role === "platformAdmin"
  ) {
    return next();
  }

  const status = tenant.subscriptionStatus;

  // Set subscription status header for frontend banner logic
  res.setHeader("X-Subscription-Status", status);
  res.setHeader("X-Plan-Tier", tenant.plan);

  // Add trial/expiry info headers
  if (status === "TRIAL" && tenant.trialEndsAt) {
    const daysLeft = Math.ceil(
      (tenant.trialEndsAt.getTime() - Date.now()) / 86400000,
    );
    res.setHeader("X-Trial-Days-Left", Math.max(0, daysLeft).toString());
  }

  if (tenant.planExpiresAt) {
    const daysLeft = Math.ceil(
      (tenant.planExpiresAt.getTime() - Date.now()) / 86400000,
    );
    res.setHeader("X-Days-Until-Expiry", Math.max(0, daysLeft).toString());
  }

  // LOCKED or CANCELLED: block everything except subscription management
  if (status === "LOCKED" || status === "CANCELLED") {
    const isSubscriptionRoute = req.path.includes("/subscription");
    if (!isSubscriptionRoute) {
      return res.status(403).json({
        error: "subscription_expired",
        message:
          "Your subscription has expired. Please renew to continue using the system.",
        subscriptionStatus: status,
      });
    }
  }

  // SUSPENDED: allow reads (GET/HEAD/OPTIONS), block writes
  if (status === "SUSPENDED") {
    const isReadMethod = ["GET", "HEAD", "OPTIONS"].includes(req.method);
    const isSubscriptionRoute = req.path.includes("/subscription");

    if (!isReadMethod && !isSubscriptionRoute) {
      return res.status(403).json({
        error: "subscription_suspended",
        message:
          "Your account is suspended. You can view data but cannot make changes. Renew to restore full access.",
        subscriptionStatus: status,
      });
    }
  }

  next();
};

export default checkSubscription;
