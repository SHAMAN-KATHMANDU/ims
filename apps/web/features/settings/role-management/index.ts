/**
 * Public API of the role-management feature.
 *
 * Lives under `features/settings/role-management/` because it's part of the
 * Settings vertical. `ResourceOverwritesPanel` is re-exported here so any
 * feature page (Deal, Product, Pipeline, …) can mount it on a "Permissions"
 * tab via a single import.
 */

export { RolesPage } from "./components/RolesPage";
export { RoleEditor, type RoleEditorProps } from "./components/RoleEditor";
export {
  ResourceOverwritesPanel,
  type ResourceOverwritesPanelProps,
} from "./components/ResourceOverwritesPanel";
export { RoleMembersPanel } from "./components/RoleMembersPanel";
export { PermissionToggleRow } from "./components/PermissionToggleRow";

export { RoleEditorSchema, type RoleEditorInput } from "./validation";
export type { OverwriteState, RoleEditorFormValues } from "./types";
