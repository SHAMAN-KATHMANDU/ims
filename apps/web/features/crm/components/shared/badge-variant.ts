// The set of variants supported by components/ui/badge.tsx, re-exported as a
// type so CRM helpers can map domain values (tiers, statuses) to badge variants
// without importing the component.
export type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info";
