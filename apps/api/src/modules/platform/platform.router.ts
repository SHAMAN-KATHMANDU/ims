/**
 * Platform Admin Routes — Tenant management for platform administrators.
 *
 * All routes require authentication + platformAdmin role.
 * These routes bypass tenant scoping since they operate across tenants.
 */

import { Router } from "express";
import verifyToken from "@/middlewares/authMiddleware";
import authorizeRoles from "@/middlewares/roleMiddleware";
import platformController from "./platform.controller";

const router = Router();

// All platform routes require platformAdmin role
router.use(verifyToken, authorizeRoles("platformAdmin"));

// Tenant CRUD
router.post("/tenants", platformController.createTenant);
router.get("/tenants", platformController.listTenants);
router.get("/tenants/:id", platformController.getTenant);
router.put("/tenants/:id", platformController.updateTenant);
router.patch("/tenants/:id/plan", platformController.changePlan);
router.delete("/tenants/:id", platformController.deactivateTenant);

// Platform-wide stats
router.get("/stats", platformController.getStats);

export default router;
