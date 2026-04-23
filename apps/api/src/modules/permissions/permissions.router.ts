/**
 * Permissions Router
 *
 * Routes for role management, role member assignment, permission overwrites, and effective permissions.
 * All routes require authentication via verifyToken + resolveTenant middleware.
 *
 * PHASE-2-SWAP: Replace authorizeRoles() gates with requirePermission() middleware once Phase 1 is complete.
 */

import { Router } from "express";
import authorizeRoles from "@/middlewares/roleMiddleware";
import { asyncHandler } from "@/middlewares/errorHandler";
import PermissionsController from "./permissions.controller";

/**
 * Stub service — replaced with real implementation from rbac-core
 */
const stubService = {
  createRole: async (tenantId: string, data: any) => ({ id: "stub", ...data }),
  listRoles: async (tenantId: string, params: any) => ({
    roles: [],
    pagination: {},
  }),
  getRoleById: async (tenantId: string, roleId: string) => ({ id: roleId }),
  updateRole: async (tenantId: string, roleId: string, data: any) => ({
    id: roleId,
    ...data,
  }),
  deleteRole: async (tenantId: string, roleId: string) => {},
  assignUserToRole: async (
    tenantId: string,
    roleId: string,
    userId: string,
  ) => ({ userId, roleId }),
  unassignUserFromRole: async (
    tenantId: string,
    roleId: string,
    userId: string,
  ) => {},
  listPermissionOverwrites: async (tenantId: string, resourceId: string) => [],
  upsertPermissionOverwrite: async (
    tenantId: string,
    resourceId: string,
    data: any,
  ) => ({ id: "stub", ...data }),
  deletePermissionOverwrite: async (
    tenantId: string,
    resourceId: string,
    overwriteId: string,
  ) => {},
  getEffectivePermissions: async (
    tenantId: string,
    userId: string,
    resourceId: string,
  ) => "AA==",
  bulkResolvePermissions: async (
    tenantId: string,
    userId: string,
    resourceIds: string[],
  ) => ({}),
};

const permissionsController = new PermissionsController(stubService);
const permissionsRouter = Router();

// ============ Role Management ============

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new custom role
 *     description: Create a custom role in the tenant. System roles cannot be created.
 *     tags: [Permissions - Roles]
 *     operationId: createRole
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, priority, permissions]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *                 description: Role name
 *               priority:
 *                 type: integer
 *                 minimum: 1
 *                 description: Role priority (higher priority = lower precedence)
 *               permissions:
 *                 type: string
 *                 description: Base64-encoded 64-byte permission bitset
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *                 description: Hex color code (e.g., #FF0000)
 *     responses:
 *       201:
 *         description: Role created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     role:
 *                       $ref: '#/components/schemas/Role'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (insufficient role)
 */
permissionsRouter.post(
  "/roles",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(permissionsController.createRole),
);

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: List roles in the tenant
 *     description: List all roles with pagination and optional search filtering.
 *     tags: [Permissions - Roles]
 *     operationId: listRoles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PaginationPage'
 *       - $ref: '#/components/parameters/PaginationLimit'
 *       - $ref: '#/components/parameters/Search'
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     roles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Role'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 */
permissionsRouter.get("/roles", asyncHandler(permissionsController.listRoles));

/**
 * @swagger
 * /roles/{roleId}:
 *   get:
 *     summary: Get a role by ID
 *     description: Retrieve a single role by its ID.
 *     tags: [Permissions - Roles]
 *     operationId: getRoleById
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     role:
 *                       $ref: '#/components/schemas/Role'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Role not found
 */
permissionsRouter.get(
  "/roles/:roleId",
  asyncHandler(permissionsController.getRoleById),
);

/**
 * @swagger
 * /roles/{roleId}:
 *   patch:
 *     summary: Update a role
 *     description: Update role name, priority, permissions, or color. System roles cannot be updated.
 *     tags: [Permissions - Roles]
 *     operationId: updateRole
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               priority:
 *                 type: integer
 *                 minimum: 1
 *               permissions:
 *                 type: string
 *                 description: Base64-encoded 64-byte permission bitset
 *               color:
 *                 type: string
 *                 pattern: '^#[0-9A-Fa-f]{6}$'
 *     responses:
 *       200:
 *         description: Role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     role:
 *                       $ref: '#/components/schemas/Role'
 *       400:
 *         description: Validation error or system role cannot be updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */
permissionsRouter.patch(
  "/roles/:roleId",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(permissionsController.updateRole),
);

/**
 * @swagger
 * /roles/{roleId}:
 *   delete:
 *     summary: Delete a role
 *     description: Delete a custom role. System roles cannot be deleted.
 *     tags: [Permissions - Roles]
 *     operationId: deleteRole
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden or system role cannot be deleted
 *       404:
 *         description: Role not found
 */
permissionsRouter.delete(
  "/roles/:roleId",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(permissionsController.deleteRole),
);

// ============ Role Member Management ============

/**
 * @swagger
 * /roles/{roleId}/members:
 *   post:
 *     summary: Assign a user to a role
 *     description: Assign a user to a role in the tenant.
 *     tags: [Permissions - Members]
 *     operationId: assignUserToRole
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID to assign
 *     responses:
 *       201:
 *         description: User assigned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role or user not found
 *       409:
 *         description: User already assigned to this role
 */
permissionsRouter.post(
  "/roles/:roleId/members",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(permissionsController.assignUserToRole),
);

/**
 * @swagger
 * /roles/{roleId}/members/{userId}:
 *   delete:
 *     summary: Unassign a user from a role
 *     description: Unassign a user from a role in the tenant.
 *     tags: [Permissions - Members]
 *     operationId: unassignUserFromRole
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Role ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: User ID to unassign
 *     responses:
 *       200:
 *         description: User unassigned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Assignment not found
 */
permissionsRouter.delete(
  "/roles/:roleId/members/:userId",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(permissionsController.unassignUserFromRole),
);

// ============ Permission Overwrites ============

/**
 * @swagger
 * /resources/{resourceId}/overwrites:
 *   get:
 *     summary: List permission overwrites for a resource
 *     description: List all permission overwrites (allow/deny bitsets) for a specific resource.
 *     tags: [Permissions - Overwrites]
 *     operationId: listPermissionOverwrites
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Resource ID
 *     responses:
 *       200:
 *         description: Overwrites retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     overwrites:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PermissionOverwrite'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
permissionsRouter.get(
  "/resources/:resourceId/overwrites",
  asyncHandler(permissionsController.listPermissionOverwrites),
);

/**
 * @swagger
 * /resources/{resourceId}/overwrites:
 *   put:
 *     summary: Upsert a permission overwrite
 *     description: Create or update a permission overwrite (allow/deny bitsets for a subject on a resource).
 *     tags: [Permissions - Overwrites]
 *     operationId: upsertPermissionOverwrite
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Resource ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subjectType]
 *             properties:
 *               subjectType:
 *                 type: string
 *                 enum: [USER, ROLE]
 *               roleId:
 *                 type: string
 *                 format: uuid
 *                 description: Required when subjectType=ROLE
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: Required when subjectType=USER
 *               allow:
 *                 type: string
 *                 description: Base64-encoded 64-byte permission bitset (allow bits)
 *               deny:
 *                 type: string
 *                 description: Base64-encoded 64-byte permission bitset (deny bits)
 *     responses:
 *       200:
 *         description: Overwrite upserted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     overwrite:
 *                       $ref: '#/components/schemas/PermissionOverwrite'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
permissionsRouter.put(
  "/resources/:resourceId/overwrites",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(permissionsController.upsertPermissionOverwrite),
);

/**
 * @swagger
 * /resources/{resourceId}/overwrites/{overwriteId}:
 *   delete:
 *     summary: Delete a permission overwrite
 *     description: Delete a specific permission overwrite.
 *     tags: [Permissions - Overwrites]
 *     operationId: deletePermissionOverwrite
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Resource ID
 *       - in: path
 *         name: overwriteId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Overwrite ID
 *     responses:
 *       200:
 *         description: Overwrite deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Overwrite not found
 */
permissionsRouter.delete(
  "/resources/:resourceId/overwrites/:overwriteId",
  authorizeRoles("admin", "superAdmin"),
  asyncHandler(permissionsController.deletePermissionOverwrite),
);

// ============ Effective Permissions ============

/**
 * @swagger
 * /me/effective:
 *   get:
 *     summary: Get current user's effective permissions for a resource
 *     description: Resolve the current user's effective permission bitset for a specific resource.
 *     tags: [Permissions - Effective]
 *     operationId: getEffectivePermissions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: resourceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Resource ID
 *     responses:
 *       200:
 *         description: Effective permissions resolved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data:
 *                   type: object
 *                   properties:
 *                     resourceId:
 *                       type: string
 *                       format: uuid
 *                     permissions:
 *                       type: string
 *                       description: Base64-encoded 64-byte bitset
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Resource not found
 */
permissionsRouter.get(
  "/me/effective",
  asyncHandler(permissionsController.getEffectivePermissions),
);

/**
 * @swagger
 * /me/bulk-resolve:
 *   post:
 *     summary: Bulk resolve effective permissions for current user
 *     description: Resolve the current user's effective permissions across multiple resources in one call.
 *     tags: [Permissions - Effective]
 *     operationId: bulkResolvePermissions
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resourceIds]
 *             properties:
 *               resourceIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 description: Array of resource IDs
 *     responses:
 *       200:
 *         description: Effective permissions resolved for all resources
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, enum: [true] }
 *                 data:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *                     description: Base64-encoded 64-byte bitset per resourceId
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
permissionsRouter.post(
  "/me/bulk-resolve",
  asyncHandler(permissionsController.bulkResolvePermissions),
);

export default permissionsRouter;
