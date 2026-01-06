import { Router } from "express";
import verifyToken from "../../middlewares/authMiddleware";
import authorizeRoles from "../../middlewares/roleMiddleware";
import productController from "./product.controller";

const productRouter = Router();

// ========== Product CRUD Operations ==========
// Create product (admin only)
productRouter.post(
  '/',
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  productController.createProduct
);

// Get all products (admin and user can view)
productRouter.get(
  '/',
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  productController.getAllProducts
);

// Get product by ID (admin and user can view)
productRouter.get(
  '/:id',
  verifyToken,
  authorizeRoles("admin", "user", "superAdmin"),
  productController.getProductById
);

// Update product (admin only)
productRouter.put(
  '/:id',
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  productController.updateProduct
);

// Delete product (admin only)
productRouter.delete(
  '/:id',
  verifyToken,
  authorizeRoles("admin", "superAdmin"),
  productController.deleteProduct
);

export default productRouter;
