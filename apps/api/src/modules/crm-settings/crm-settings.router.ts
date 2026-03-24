import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { enforcePlanFeature } from "@/middlewares/enforcePlanLimits";
import { asyncHandler } from "@/middlewares/errorHandler";
import crmSettingsController from "./crm-settings.controller";

const crmSettingsRouter = Router();

crmSettingsRouter.use(authorizeRoles("user", "admin", "superAdmin"));
crmSettingsRouter.use(enforcePlanFeature("salesPipeline"));

/**
 * @swagger
 * /crm-settings/sources:
 *   get:
 *     summary: Get all CRM sources
 *     tags: [CRMSettings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Sources list }
 */
crmSettingsRouter.get(
  "/sources",
  asyncHandler(crmSettingsController.getAllSources),
);

/**
 * @swagger
 * /crm-settings/sources:
 *   post:
 *     summary: Create CRM source
 *     tags: [CRMSettings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201: { description: Source created }
 */
crmSettingsRouter.post(
  "/sources",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(crmSettingsController.createSource),
);

/**
 * @swagger
 * /crm-settings/sources/{id}:
 *   put:
 *     summary: Update CRM source
 *     tags: [CRMSettings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200: { description: Source updated }
 */
crmSettingsRouter.put(
  "/sources/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(crmSettingsController.updateSource),
);

/**
 * @swagger
 * /crm-settings/sources/{id}:
 *   delete:
 *     summary: Delete CRM source
 *     tags: [CRMSettings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Source deleted }
 */
crmSettingsRouter.delete(
  "/sources/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(crmSettingsController.deleteSource),
);

/**
 * @swagger
 * /crm-settings/journey-types:
 *   get:
 *     summary: Get all journey types
 *     tags: [CRMSettings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Journey types list }
 */
crmSettingsRouter.get(
  "/journey-types",
  asyncHandler(crmSettingsController.getAllJourneyTypes),
);

/**
 * @swagger
 * /crm-settings/journey-types:
 *   post:
 *     summary: Create journey type
 *     tags: [CRMSettings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201: { description: Journey type created }
 */
crmSettingsRouter.post(
  "/journey-types",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(crmSettingsController.createJourneyType),
);

/**
 * @swagger
 * /crm-settings/journey-types/{id}:
 *   put:
 *     summary: Update journey type
 *     tags: [CRMSettings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *     responses:
 *       200: { description: Journey type updated }
 */
crmSettingsRouter.put(
  "/journey-types/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(crmSettingsController.updateJourneyType),
);

/**
 * @swagger
 * /crm-settings/journey-types/{id}:
 *   delete:
 *     summary: Delete journey type
 *     tags: [CRMSettings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Journey type deleted }
 */
crmSettingsRouter.delete(
  "/journey-types/:id",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(crmSettingsController.deleteJourneyType),
);

export default crmSettingsRouter;
