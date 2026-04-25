/**
 * Permissions Controller
 *
 * Thin HTTP layer for role, member, and permission overwrite management.
 * All methods are arrow function fields to preserve `this` context when passed to asyncHandler.
 * All business logic delegated to permissionService.
 * All HTTP responses use ok() / fail() helpers from @/shared/response.
 */

import { Request, Response } from "express";
import { ZodError } from "zod";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { ok, fail } from "@/shared/response";
import { sendControllerError } from "@/utils/controllerError";
import { AppError } from "@/middlewares/errorHandler";
import {
  CreateRoleSchema,
  UpdateRoleSchema,
  ListRolesQuerySchema,
  AssignUserToRoleSchema,
  UpsertPermissionOverwriteSchema,
  GetEffectivePermissionsQuerySchema,
  BulkResolvePermissionsSchema,
} from "./permissions.schema";

/**
 * Placeholder for the PermissionService.
 * In Phase 1, the service is stubbed; rbac-core provides the real implementation.
 */
interface IPermissionService {
  createRole(tenantId: string, data: any): Promise<any>;
  listRoles(tenantId: string, params: any): Promise<any>;
  getRoleById(tenantId: string, roleId: string): Promise<any>;
  updateRole(tenantId: string, roleId: string, data: any): Promise<any>;
  deleteRole(tenantId: string, roleId: string): Promise<void>;
  listRoleMembers(tenantId: string, roleId: string): Promise<any[]>;
  assignUserToRole(
    tenantId: string,
    roleId: string,
    userId: string,
  ): Promise<any>;
  unassignUserFromRole(
    tenantId: string,
    roleId: string,
    userId: string,
  ): Promise<void>;
  listPermissionOverwrites(
    tenantId: string,
    resourceId: string,
  ): Promise<any[]>;
  upsertPermissionOverwrite(
    tenantId: string,
    resourceId: string,
    data: any,
  ): Promise<any>;
  deletePermissionOverwrite(
    tenantId: string,
    resourceId: string,
    overwriteId: string,
  ): Promise<void>;
  getEffectivePermissions(
    tenantId: string,
    userId: string,
    resourceId: string,
  ): Promise<string>;
  bulkResolvePermissions(
    tenantId: string,
    userId: string,
    resourceIds: string[],
  ): Promise<Record<string, string>>;
  resolveWorkspaceResourceId(tenantId: string): Promise<string>;
}

class PermissionsController {
  constructor(private service: IPermissionService) {}

  // ============ Role Management ============

  /**
   * POST /roles
   * Create a new custom role in the tenant.
   * Rejects if isSystem=true (system roles cannot be created).
   */
  createRole = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const body = CreateRoleSchema.parse(req.body);
      const role = await this.service.createRole(tenantId, body);
      return ok(res, { role }, 201);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      if ((error as AppError).statusCode) {
        return fail(
          res,
          (error as AppError).message,
          (error as AppError).statusCode,
        );
      }
      return sendControllerError(req, res, error, "createRole");
    }
  };

  /**
   * GET /roles
   * List roles in the tenant with pagination and optional search.
   */
  listRoles = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const query = ListRolesQuerySchema.parse(req.query);
      const result = await this.service.listRoles(tenantId, query);
      return ok(res, result);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      return sendControllerError(req, res, error, "listRoles");
    }
  };

  /**
   * GET /roles/:roleId
   * Get a single role by ID.
   */
  getRoleById = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { roleId } = req.params;
      const role = await this.service.getRoleById(tenantId, roleId);
      return ok(res, { role });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return fail(
          res,
          (error as AppError).message,
          (error as AppError).statusCode,
        );
      }
      return sendControllerError(req, res, error, "getRoleById");
    }
  };

  /**
   * PATCH /roles/:roleId
   * Update role name, priority, permissions, or color.
   * Rejects if isSystem=true.
   */
  updateRole = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { roleId } = req.params;
      const body = UpdateRoleSchema.parse(req.body);
      const role = await this.service.updateRole(tenantId, roleId, body);
      return ok(res, { role });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      if ((error as AppError).statusCode) {
        return fail(
          res,
          (error as AppError).message,
          (error as AppError).statusCode,
        );
      }
      return sendControllerError(req, res, error, "updateRole");
    }
  };

  /**
   * DELETE /roles/:roleId
   * Delete a custom role.
   * Rejects if isSystem=true.
   */
  deleteRole = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { roleId } = req.params;
      await this.service.deleteRole(tenantId, roleId);
      return ok(res, { message: "Role deleted successfully" });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return fail(
          res,
          (error as AppError).message,
          (error as AppError).statusCode,
        );
      }
      return sendControllerError(req, res, error, "deleteRole");
    }
  };

  // ============ Role Member Management ============

  /**
   * GET /roles/:roleId/members
   * List users assigned to a role in the tenant.
   */
  listRoleMembers = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { roleId } = req.params;
      const members = await this.service.listRoleMembers(tenantId, roleId);
      return ok(res, { members });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return fail(
          res,
          (error as AppError).message,
          (error as AppError).statusCode,
        );
      }
      return sendControllerError(req, res, error, "listRoleMembers");
    }
  };

  /**
   * POST /roles/:roleId/members
   * Assign a user to a role in the tenant.
   */
  assignUserToRole = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { roleId } = req.params;
      const body = AssignUserToRoleSchema.parse(req.body);
      const assignment = await this.service.assignUserToRole(
        tenantId,
        roleId,
        body.userId,
      );
      return ok(res, { assignment }, 201);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      if ((error as AppError).statusCode) {
        return fail(
          res,
          (error as AppError).message,
          (error as AppError).statusCode,
        );
      }
      return sendControllerError(req, res, error, "assignUserToRole");
    }
  };

  /**
   * DELETE /roles/:roleId/members/:userId
   * Unassign a user from a role in the tenant.
   */
  unassignUserFromRole = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { roleId, userId } = req.params;
      await this.service.unassignUserFromRole(tenantId, roleId, userId);
      return ok(res, { message: "User unassigned from role successfully" });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return fail(
          res,
          (error as AppError).message,
          (error as AppError).statusCode,
        );
      }
      return sendControllerError(req, res, error, "unassignUserFromRole");
    }
  };

  // ============ Permission Overwrites ============

  /**
   * GET /resources/:resourceId/overwrites
   * List permission overwrites for a resource.
   */
  listPermissionOverwrites = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { resourceId } = req.params;
      const overwrites = await this.service.listPermissionOverwrites(
        tenantId,
        resourceId,
      );
      return ok(res, { overwrites });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return fail(
          res,
          (error as AppError).message,
          (error as AppError).statusCode,
        );
      }
      return sendControllerError(req, res, error, "listPermissionOverwrites");
    }
  };

  /**
   * PUT /resources/:resourceId/overwrites
   * Upsert a permission overwrite (allow/deny bitsets for a subject on a resource).
   */
  upsertPermissionOverwrite = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { resourceId } = req.params;
      const body = UpsertPermissionOverwriteSchema.parse(req.body);
      const overwrite = await this.service.upsertPermissionOverwrite(
        tenantId,
        resourceId,
        body,
      );
      return ok(res, { overwrite });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      if ((error as AppError).statusCode) {
        return fail(
          res,
          (error as AppError).message,
          (error as AppError).statusCode,
        );
      }
      return sendControllerError(req, res, error, "upsertPermissionOverwrite");
    }
  };

  /**
   * DELETE /resources/:resourceId/overwrites/:overwriteId
   * Delete a permission overwrite.
   */
  deletePermissionOverwrite = async (req: Request, res: Response) => {
    try {
      const { tenantId } = getAuthContext(req);
      const { resourceId, overwriteId } = req.params;
      await this.service.deletePermissionOverwrite(
        tenantId,
        resourceId,
        overwriteId,
      );
      return ok(res, { message: "Permission overwrite deleted successfully" });
    } catch (error: unknown) {
      if ((error as AppError).statusCode) {
        return fail(
          res,
          (error as AppError).message,
          (error as AppError).statusCode,
        );
      }
      return sendControllerError(req, res, error, "deletePermissionOverwrite");
    }
  };

  // ============ Effective Permissions ============

  /**
   * GET /me/effective?resourceId=<uuid>
   * Get the current user's effective permission bitset for a resource.
   * Returns base64-encoded bitset.
   */
  getEffectivePermissions = async (req: Request, res: Response) => {
    try {
      const { userId, tenantId } = getAuthContext(req);
      const query = GetEffectivePermissionsQuerySchema.parse(req.query);
      // When the caller omits resourceId, fall back to the tenant's WORKSPACE
      // Resource so the bootstrap fetch from the frontend (no resource yet)
      // works without sending a magic string.
      const resourceId =
        query.resourceId ??
        (await this.service.resolveWorkspaceResourceId(tenantId));
      const permissions = await this.service.getEffectivePermissions(
        tenantId,
        userId,
        resourceId,
      );
      return ok(res, { resourceId, permissions });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      if ((error as AppError).statusCode) {
        return fail(
          res,
          (error as AppError).message,
          (error as AppError).statusCode,
        );
      }
      return sendControllerError(req, res, error, "getEffectivePermissions");
    }
  };

  /**
   * POST /me/bulk-resolve
   * Bulk resolve effective permissions for the current user across multiple resources.
   * Returns a map of resourceId -> base64-encoded bitset.
   */
  bulkResolvePermissions = async (req: Request, res: Response) => {
    try {
      const { userId, tenantId } = getAuthContext(req);
      const body = BulkResolvePermissionsSchema.parse(req.body);
      const permissions = await this.service.bulkResolvePermissions(
        tenantId,
        userId,
        body.resourceIds,
      );
      return ok(res, permissions);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return fail(res, error.errors[0]?.message ?? "Validation error", 400);
      }
      if ((error as AppError).statusCode) {
        return fail(
          res,
          (error as AppError).message,
          (error as AppError).statusCode,
        );
      }
      return sendControllerError(req, res, error, "bulkResolvePermissions");
    }
  };
}

export default PermissionsController;
export type { IPermissionService };
