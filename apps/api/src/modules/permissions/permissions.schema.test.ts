/**
 * Permissions Schema Unit Tests
 *
 * Tests Zod schema validation for all inputs.
 */

import { describe, it, expect } from "vitest";
import {
  CreateRoleSchema,
  UpdateRoleSchema,
  ListRolesQuerySchema,
  AssignUserToRoleSchema,
  UpsertPermissionOverwriteSchema,
  GetEffectivePermissionsQuerySchema,
  BulkResolvePermissionsSchema,
} from "./permissions.schema";

describe("Permissions Schemas", () => {
  describe("CreateRoleSchema", () => {
    it("accepts valid role creation data", () => {
      const data = {
        name: "Editor",
        priority: 500,
        permissions:
          "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        color: "#FF5733",
      };
      const result = CreateRoleSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it("rejects missing required fields", () => {
      const data = { name: "Editor" };
      const result = CreateRoleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects empty role name", () => {
      const data = {
        name: "",
        priority: 500,
        permissions: "AQAA",
      };
      const result = CreateRoleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid base64 permissions", () => {
      const data = {
        name: "Editor",
        priority: 500,
        permissions: "not-valid-base64!!!",
      };
      const result = CreateRoleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid hex color", () => {
      const data = {
        name: "Editor",
        priority: 500,
        permissions: "AQAA",
        color: "not-a-color",
      };
      const result = CreateRoleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("accepts role creation without color", () => {
      const data = {
        name: "Editor",
        priority: 500,
        permissions: "AQAA",
      };
      const result = CreateRoleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects priority = 0", () => {
      const data = {
        name: "Editor",
        priority: 0,
        permissions: "AQAA",
      };
      const result = CreateRoleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects non-integer priority", () => {
      const data = {
        name: "Editor",
        priority: 500.5,
        permissions: "AQAA",
      };
      const result = CreateRoleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("UpdateRoleSchema", () => {
    it("accepts partial role updates", () => {
      const data = { name: "Updated Editor" };
      const result = UpdateRoleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts multiple field updates", () => {
      const data = {
        name: "Updated Editor",
        priority: 600,
        color: "#00FF00",
      };
      const result = UpdateRoleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects all-empty update object", () => {
      const data = {};
      const result = UpdateRoleSchema.safeParse(data);
      expect(result.success).toBe(false); // .refine() validates at least one field
    });

    it("rejects invalid base64 in permissions", () => {
      const data = {
        permissions: "invalid!!!",
      };
      const result = UpdateRoleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("ListRolesQuerySchema", () => {
    it("accepts empty query", () => {
      const data = {};
      const result = ListRolesQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("parses page as integer", () => {
      const data = { page: "1" };
      const result = ListRolesQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(1);
    });

    it("parses limit capped at 100", () => {
      const data = { limit: "200" };
      const result = ListRolesQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data?.limit).toBe(100);
    });

    it("trims search term", () => {
      const data = { search: "  Editor  " };
      const result = ListRolesQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data?.search).toBe("Editor");
    });

    it("converts empty search to undefined", () => {
      const data = { search: "   " };
      const result = ListRolesQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data?.search).toBeUndefined();
    });
  });

  describe("AssignUserToRoleSchema", () => {
    it("accepts valid user assignment", () => {
      const data = { userId: "550e8400-e29b-41d4-a716-446655440000" };
      const result = AssignUserToRoleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects invalid UUID", () => {
      const data = { userId: "not-a-uuid" };
      const result = AssignUserToRoleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects missing userId", () => {
      const data = {};
      const result = AssignUserToRoleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("UpsertPermissionOverwriteSchema", () => {
    it("accepts ROLE subject type with roleId", () => {
      const data = {
        subjectType: "ROLE",
        roleId: "550e8400-e29b-41d4-a716-446655440000",
        allow: "AQAA",
      };
      const result = UpsertPermissionOverwriteSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("accepts USER subject type with userId", () => {
      const data = {
        subjectType: "USER",
        userId: "550e8400-e29b-41d4-a716-446655440000",
        deny: "BAAA",
      };
      const result = UpsertPermissionOverwriteSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects ROLE without roleId", () => {
      const data = {
        subjectType: "ROLE",
        userId: "550e8400-e29b-41d4-a716-446655440000",
      };
      const result = UpsertPermissionOverwriteSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects USER without userId", () => {
      const data = {
        subjectType: "USER",
        roleId: "550e8400-e29b-41d4-a716-446655440000",
      };
      const result = UpsertPermissionOverwriteSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects invalid subjectType", () => {
      const data = {
        subjectType: "INVALID",
        roleId: "550e8400-e29b-41d4-a716-446655440000",
      };
      const result = UpsertPermissionOverwriteSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("accepts empty allow/deny (optional)", () => {
      const data = {
        subjectType: "ROLE",
        roleId: "550e8400-e29b-41d4-a716-446655440000",
      };
      const result = UpsertPermissionOverwriteSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("GetEffectivePermissionsQuerySchema", () => {
    it("accepts valid resource ID", () => {
      const data = { resourceId: "550e8400-e29b-41d4-a716-446655440000" };
      const result = GetEffectivePermissionsQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects invalid UUID", () => {
      const data = { resourceId: "not-a-uuid" };
      const result = GetEffectivePermissionsQuerySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("accepts missing resourceId — controller resolves workspace fallback", () => {
      const data = {};
      const result = GetEffectivePermissionsQuerySchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("BulkResolvePermissionsSchema", () => {
    it("accepts array of resource IDs", () => {
      const data = {
        resourceIds: [
          "550e8400-e29b-41d4-a716-446655440000",
          "660e8400-e29b-41d4-a716-446655440000",
        ],
      };
      const result = BulkResolvePermissionsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects empty resource ID array", () => {
      const data = { resourceIds: [] };
      const result = BulkResolvePermissionsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects non-UUID in array", () => {
      const data = {
        resourceIds: ["550e8400-e29b-41d4-a716-446655440000", "not-a-uuid"],
      };
      const result = BulkResolvePermissionsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects missing resourceIds field", () => {
      const data = {};
      const result = BulkResolvePermissionsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
