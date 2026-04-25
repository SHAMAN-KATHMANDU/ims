/**
 * Permissions Controller Unit Tests
 *
 * Tests the controller layer in isolation using mocked services.
 * Follows the pattern from api-architecture.md.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

// Mock declarations must be at top level (hoisted by Vitest)
vi.mock("@/shared/auth/getAuthContext", () => ({
  getAuthContext: vi.fn(),
}));

vi.mock("@/utils/controllerError", () => ({
  sendControllerError: vi.fn(),
}));

// Import after mocks are declared
import PermissionsController from "./permissions.controller";
import { getAuthContext } from "@/shared/auth/getAuthContext";
import { sendControllerError } from "@/utils/controllerError";

/**
 * Helper: Create a mock Response object with chainable methods
 */
function mockRes(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

/**
 * Helper: Create a mock Request object with default auth context
 */
function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    user: { id: "u1", tenantId: "t1", role: "admin" },
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

/**
 * Stub service for testing
 */
const mockService = {
  createRole: vi.fn(),
  listRoles: vi.fn(),
  getRoleById: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
  listRoleMembers: vi.fn().mockResolvedValue([]),
  assignUserToRole: vi.fn(),
  unassignUserFromRole: vi.fn(),
  listPermissionOverwrites: vi.fn(),
  upsertPermissionOverwrite: vi.fn(),
  deletePermissionOverwrite: vi.fn(),
  getEffectivePermissions: vi.fn(),
  bulkResolvePermissions: vi.fn(),
  resolveWorkspaceResourceId: vi
    .fn()
    .mockResolvedValue("11111111-1111-1111-1111-111111111111"),
};

describe("PermissionsController", () => {
  const controller = new PermissionsController(mockService);

  beforeEach(() => {
    vi.clearAllMocks();
    (getAuthContext as any).mockReturnValue({ userId: "u1", tenantId: "t1" });
  });

  describe("createRole", () => {
    it("returns 201 with created role on success", async () => {
      const roleData = {
        id: "r1",
        name: "Editor",
        priority: 500,
        permissions: "AQAA",
        isSystem: false,
      };
      mockService.createRole.mockResolvedValue(roleData);

      const req = makeReq({
        body: { name: "Editor", priority: 500, permissions: "AQAA" },
      });
      const res = mockRes() as Response;

      await controller.createRole(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { role: roleData },
      });
    });

    it("returns 400 on Zod validation error", async () => {
      const req = makeReq({ body: { name: "" } }); // Invalid: empty name
      const res = mockRes() as Response;

      await controller.createRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.createRole.mockRejectedValue(new Error("DB error"));

      const req = makeReq({
        body: { name: "Editor", priority: 500, permissions: "AQAA" },
      });
      const res = mockRes() as Response;

      await controller.createRole(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("listRoles", () => {
    it("returns roles with pagination", async () => {
      const rolesData = {
        roles: [{ id: "r1", name: "Editor" }],
        pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
      };
      mockService.listRoles.mockResolvedValue(rolesData);

      const req = makeReq({ query: { page: "1", limit: "10" } });
      const res = mockRes() as Response;

      await controller.listRoles(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: rolesData,
      });
    });

    it("calls sendControllerError on unexpected error", async () => {
      mockService.listRoles.mockRejectedValue(new Error("DB error"));

      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listRoles(req, res);

      expect(sendControllerError).toHaveBeenCalled();
    });
  });

  describe("getRoleById", () => {
    it("returns a role by ID", async () => {
      const roleData = { id: "r1", name: "Editor" };
      mockService.getRoleById.mockResolvedValue(roleData);

      const req = makeReq({
        params: { roleId: "11111111-1111-1111-1111-111111111111" },
      });
      const res = mockRes() as Response;

      await controller.getRoleById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { role: roleData },
      });
    });

    it("returns 404 when role not found", async () => {
      const notFoundError = new Error("Role not found") as any;
      notFoundError.statusCode = 404;
      mockService.getRoleById.mockRejectedValue(notFoundError);

      const req = makeReq({ params: { roleId: "nonexistent" } });
      const res = mockRes() as Response;

      await controller.getRoleById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Role not found",
      });
    });
  });

  describe("updateRole", () => {
    it("updates and returns the role", async () => {
      const updatedRole = { id: "r1", name: "Updated Editor", priority: 600 };
      mockService.updateRole.mockResolvedValue(updatedRole);

      const req = makeReq({
        params: { roleId: "11111111-1111-1111-1111-111111111111" },
        body: { name: "Updated Editor", priority: 600 },
      });
      const res = mockRes() as Response;

      await controller.updateRole(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { role: updatedRole },
      });
    });
  });

  describe("deleteRole", () => {
    it("deletes a role successfully", async () => {
      mockService.deleteRole.mockResolvedValue(undefined);

      const req = makeReq({
        params: { roleId: "11111111-1111-1111-1111-111111111111" },
      });
      const res = mockRes() as Response;

      await controller.deleteRole(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { message: "Role deleted successfully" },
      });
    });

    it("returns 403 when trying to delete a system role", async () => {
      const forbiddenError = new Error("Cannot delete system role") as any;
      forbiddenError.statusCode = 403;
      mockService.deleteRole.mockRejectedValue(forbiddenError);

      const req = makeReq({ params: { roleId: "system-admin" } });
      const res = mockRes() as Response;

      await controller.deleteRole(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Cannot delete system role",
      });
    });
  });

  describe("assignUserToRole", () => {
    it("assigns a user to a role", async () => {
      const assignment = { userId: "u2", roleId: "r1" };
      mockService.assignUserToRole.mockResolvedValue(assignment);

      const req = makeReq({
        params: { roleId: "11111111-1111-1111-1111-111111111111" },
        body: { userId: "22222222-2222-2222-2222-222222222222" },
      });
      const res = mockRes() as Response;

      await controller.assignUserToRole(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { assignment },
      });
    });

    it("returns 400 on invalid userId", async () => {
      const req = makeReq({
        params: { roleId: "11111111-1111-1111-1111-111111111111" },
        body: { userId: "not-a-uuid" },
      });
      const res = mockRes() as Response;

      await controller.assignUserToRole(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });
  });

  describe("unassignUserFromRole", () => {
    it("unassigns a user from a role", async () => {
      mockService.unassignUserFromRole.mockResolvedValue(undefined);

      const req = makeReq({
        params: {
          roleId: "11111111-1111-1111-1111-111111111111",
          userId: "22222222-2222-2222-2222-222222222222",
        },
      });
      const res = mockRes() as Response;

      await controller.unassignUserFromRole(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { message: "User unassigned from role successfully" },
      });
    });
  });

  describe("listPermissionOverwrites", () => {
    it("lists overwrites for a resource", async () => {
      const overwrites = [
        {
          id: "ow1",
          subjectType: "ROLE",
          roleId: "r1",
          allow: "AQAA",
          deny: "AAAA",
        },
      ];
      mockService.listPermissionOverwrites.mockResolvedValue(overwrites);

      const req = makeReq({
        params: { resourceId: "33333333-3333-3333-3333-333333333333" },
      });
      const res = mockRes() as Response;

      await controller.listPermissionOverwrites(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { overwrites },
      });
    });
  });

  describe("upsertPermissionOverwrite", () => {
    it("upserts a permission overwrite", async () => {
      const overwrite = {
        id: "ow1",
        subjectType: "ROLE",
        roleId: "r1",
        allow: "AQAA",
      };
      mockService.upsertPermissionOverwrite.mockResolvedValue(overwrite);

      const req = makeReq({
        params: { resourceId: "33333333-3333-3333-3333-333333333333" },
        body: {
          subjectType: "ROLE",
          roleId: "11111111-1111-1111-1111-111111111111",
          allow: "AQAA",
        },
      });
      const res = mockRes() as Response;

      await controller.upsertPermissionOverwrite(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { overwrite },
      });
    });

    it("returns 400 when roleId missing for ROLE subject type", async () => {
      const req = makeReq({
        params: { resourceId: "33333333-3333-3333-3333-333333333333" },
        body: { subjectType: "ROLE", allow: "AQAA" }, // Missing roleId
      });
      const res = mockRes() as Response;

      await controller.upsertPermissionOverwrite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("deletePermissionOverwrite", () => {
    it("deletes a permission overwrite", async () => {
      mockService.deletePermissionOverwrite.mockResolvedValue(undefined);

      const req = makeReq({
        params: {
          resourceId: "33333333-3333-3333-3333-333333333333",
          overwriteId: "44444444-4444-4444-4444-444444444444",
        },
      });
      const res = mockRes() as Response;

      await controller.deletePermissionOverwrite(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { message: "Permission overwrite deleted successfully" },
      });
    });
  });

  describe("getEffectivePermissions", () => {
    it("resolves effective permissions for a resource", async () => {
      mockService.getEffectivePermissions.mockResolvedValue("AQAAAAAAAAAA");

      const req = makeReq({
        query: { resourceId: "33333333-3333-3333-3333-333333333333" },
      });
      const res = mockRes() as Response;

      await controller.getEffectivePermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          resourceId: "33333333-3333-3333-3333-333333333333",
          permissions: "AQAAAAAAAAAA",
        },
      });
    });

    it("falls back to the workspace Resource when resourceId is missing", async () => {
      const workspaceId = "11111111-1111-1111-1111-111111111111";
      mockService.resolveWorkspaceResourceId.mockResolvedValue(workspaceId);
      mockService.getEffectivePermissions.mockResolvedValue("AQAAAAAAAAAA");

      const req = makeReq({ query: {} });
      const res = mockRes() as Response;

      await controller.getEffectivePermissions(req, res);

      expect(mockService.resolveWorkspaceResourceId).toHaveBeenCalledWith("t1");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { resourceId: workspaceId, permissions: "AQAAAAAAAAAA" },
      });
    });
  });

  describe("bulkResolvePermissions", () => {
    it("bulk resolves permissions across multiple resources", async () => {
      const perms = {
        res1: "AQAA",
        res2: "BAAA",
      };
      mockService.bulkResolvePermissions.mockResolvedValue(perms);

      const req = makeReq({
        body: {
          resourceIds: [
            "33333333-3333-3333-3333-333333333333",
            "55555555-5555-5555-5555-555555555555",
          ],
        },
      });
      const res = mockRes() as Response;

      await controller.bulkResolvePermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: perms,
      });
    });

    it("returns 400 when resourceIds array is empty", async () => {
      const req = makeReq({
        body: { resourceIds: [] },
      });
      const res = mockRes() as Response;

      await controller.bulkResolvePermissions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("Auth context", () => {
    it("calls getAuthContext on every request", async () => {
      mockService.listRoles.mockResolvedValue({ roles: [], pagination: {} });

      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listRoles(req, res);

      expect(getAuthContext).toHaveBeenCalledWith(req);
    });

    it("throws 401 when getAuthContext fails", async () => {
      (getAuthContext as any).mockImplementation(() => {
        const err = new Error("Unauthorized") as any;
        err.statusCode = 401;
        throw err;
      });

      const req = makeReq();
      const res = mockRes() as Response;

      await controller.listRoles(req, res);

      // The error should be caught by sendControllerError
      expect(sendControllerError).toHaveBeenCalled();
    });
  });
});
