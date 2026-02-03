/**
 * Route registration is the single source of truth; do not maintain a separate list of paths here.
 */

import { Request, Response, Router } from "express";
import authRouter from "@/modules/auth/auth.router";
import userRouter from "@/modules/users/user.router";
import productRouter from "@/modules/products/product.router";
import categoryRouter from "@/modules/categories/category.router";
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

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "API is running",
    version: "1.0.0",
  });
});

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/products", productRouter);
router.use("/categories", categoryRouter);
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

export default router;
