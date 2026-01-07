import { Request, Response, Router } from "express";
import authRouter from "@/modules/auth/auth.router";
import userRouter from "@/modules/users/user.router";
import productRouter from "@/modules/products/product.router";
import analyticsRouter from "@/modules/analytics/analytics.router";
import homeRouter from "@/modules/home/home.router";

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.status(200).json({ 
    message: "API is running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      products: "/api/products",
      analytics: "/api/analytics",
      home: "/api/home"
    }
  });
})

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/products", productRouter);
router.use("/analytics", analyticsRouter);
router.use("/home", homeRouter);

export default router;



