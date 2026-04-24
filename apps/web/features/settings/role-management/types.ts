import type { ModuleId } from "@repo/shared";

export const MODULE_ORDER: readonly ModuleId[] = [
  "INVENTORY",
  "SALES",
  "CRM",
  "WEBSITE",
  "REPORTS",
  "SETTINGS",
] as const;

export const MODULE_LABELS: Record<ModuleId, string> = {
  INVENTORY: "Inventory",
  SALES: "Sales",
  CRM: "CRM",
  WEBSITE: "Website",
  REPORTS: "Reports",
  SETTINGS: "Settings",
};

/** 8-swatch palette surfaced in the role editor's colour picker. */
export const ROLE_COLOR_SWATCHES: readonly string[] = [
  "#64748b", // slate
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // amber
  "#22c55e", // green
  "#0ea5e9", // sky
  "#6366f1", // indigo
  "#ec4899", // pink
] as const;

/** Overwrite tri-state for `ResourceOverwritesPanel`. */
export type OverwriteState = "allow" | "inherit" | "deny";

export interface RoleEditorFormValues {
  name: string;
  priority: number;
  color: string | null;
  /** base64-encoded 64-byte permission bitset (wire representation). */
  permissions: string;
}
