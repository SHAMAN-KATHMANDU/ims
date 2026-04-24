/**
 * Public API of the permissions feature module.
 *
 * Ownership: ui-perm-core (F1) + ui-role-mgmt (F2, bootstrap). Anything
 * downstream (RoleEditor, Sidebar, feature pages) MUST import from this file,
 * not from internals.
 */

export { Can, type CanProps } from "./components/Can";
export {
  PermissionGate,
  type PermissionGateProps,
} from "./components/PermissionGate";

export {
  useMyPermissions,
  useCan,
  myPermissionKeys,
  type UseCanResult,
} from "./hooks/use-permissions";
export {
  useRoles,
  useRole,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  roleKeys,
} from "./hooks/use-roles";
export {
  useRoleMembers,
  useAssignUserToRole,
  useUnassignUserFromRole,
  roleMemberKeys,
} from "./hooks/use-role-members";
export {
  useOverwrites,
  useEffectivePermissions,
  useUpsertOverwrite,
  useDeleteOverwrite,
  overwriteKeys,
} from "./hooks/use-overwrites";

export {
  BITSET_BYTES,
  BITSET_BITS,
  empty,
  fromBase64,
  toBase64,
  hasBit,
  setBit,
  clearBit,
  writeBit,
  popcountBits,
  equals,
  orBitset,
  andNotBitset,
  applyImplies,
  hasPermission,
} from "./lib/bitset";

export { useBulkPermissions } from "./hooks/use-bulk-permissions";

export { useHasModule, useModuleAccessMap } from "./hooks/use-has-module";

export { usePermissionsSocket } from "./hooks/use-permissions-socket";

export {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRoleMembers,
  assignUserToRole,
  unassignUserFromRole,
  getOverwrites,
  upsertOverwrite,
  deleteOverwrite,
  getEffectivePermissions,
  bulkResolvePermissions,
} from "./services/permissions.service";

export type {
  Role,
  CreateRoleData,
  UpdateRoleData,
  RolesListParams,
  PaginatedRolesResponse,
  RoleMember,
  PermissionOverwrite,
  OverwriteSubjectType,
  UpsertOverwriteData,
} from "./types";

// ─── Catalog re-exports (shared source of truth) ─────────────────────────────
// Downstream consumers import catalog types from here so this module stays the
// single entry point into the permissions feature.
export {
  PERMISSIONS,
  PERMISSIONS_BY_MODULE,
  PERMISSIONS_BY_SUBMODULE,
  PERMISSION_BY_KEY,
  PERMISSION_BY_BIT,
  ADMINISTRATOR_BIT,
  type PermissionDef,
  type ModuleId,
} from "@repo/shared";
