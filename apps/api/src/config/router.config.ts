import { Request, Response, Router } from "express";

const router = Router();

router.get('/', (req: Request, res: Response) => {
  res.status(200).type("text/plain").send("GET method called on root endpoint....");
})

import authRouter from "../modules/auth/auth.router";
router.use("/auth", authRouter);

import userRouter from "../modules/users/user.router";
router.use("/users", userRouter);

import productRouter from "../modules/products/product.router";
router.use("/products", productRouter);

export default router;



