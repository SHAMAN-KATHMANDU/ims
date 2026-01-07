import { Request, Response, Router } from "express";
import authRouter from "@/modules/auth/auth.router";
import userRouter from "@/modules/users/user.router";
import productRouter from "@/modules/products/product.router";

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.status(200).type("text/plain").send("GET method called on root endpoint....");
})

router.use("/auth", authRouter);

router.use("/users", userRouter);

router.use("/products", productRouter);

export default router;



