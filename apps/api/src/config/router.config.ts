import { Request, Response, Router } from "express";
import authRouter from "@/modules/auth/auth.router";
import userRouter from "@/modules/users/user.router";
import productRouter from "@/modules/products/product.router";
import categoryRouter from "@/modules/categories/category.router";
import locationRouter from "@/modules/locations/location.router";
import inventoryRouter from "@/modules/inventory/inventory.router";
import transferRouter from "@/modules/transfers/transfer.router";
import memberRouter from "@/modules/members/member.router";
import saleRouter from "@/modules/sales/sale.router";
import promoRouter from "@/modules/promos/promo.router";
// import analyticsRouter from "@/modules/analytics/analytics.router";
// import homeRouter from "@/modules/home/home.router";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "API is running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/v1/auth",
      users: "/api/v1/users",
      products: "/api/v1/products",
      categories: "/api/v1/categories",
      locations: "/api/v1/locations",
      inventory: "/api/v1/inventory",
      transfers: "/api/v1/transfers",
      members: "/api/v1/members",
      sales: "/api/v1/sales",
      promos: "/api/v1/promos",
      analytics: "/api/v1/analytics",
      home: "/api/v1/home",
    },
  });
});

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/products", productRouter);
router.use("/categories", categoryRouter);
router.use("/locations", locationRouter);
router.use("/inventory", inventoryRouter);
router.use("/transfers", transferRouter);
router.use("/members", memberRouter);
router.use("/sales", saleRouter);
router.use("/promos", promoRouter);
// router.use("/analytics", analyticsRouter);
// router.use("/home", homeRouter);

export default router;
