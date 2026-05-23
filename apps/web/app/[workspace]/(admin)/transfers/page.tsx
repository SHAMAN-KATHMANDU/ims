import { TransfersPage } from "@/features/transfers";

export const metadata = { title: "Transfers" };

/**
 * Route shell — auth-only. The page is intentionally NOT wrapped in
 * `PermissionGate perm="INVENTORY.TRANSFERS.VIEW"`.
 *
 * Why (issue #559, same seed-drift family as #486 / #488 / #530 / #535 /
 * #538-#540 documented in `permission.service.ts:59`):
 *
 * - `GET /transfers` on the API has no `requirePermission` middleware — it
 *   is auth-only and tenant-scoped via `req.user!.tenantId`
 *   (`transfer.router.ts:117` keeps the gate off pending the Phase 3
 *   service-layer `filterVisible`). Adding a page-level gate here was a
 *   *stricter* check than the API itself enforces.
 *
 * - When the gate denied access — which happened to any legacy `user`
 *   whose RBAC seed had not yet linked them to STAFF — the underlying
 *   `useCan` / `getEffectivePermissions` flow surfaced an Unauthorized
 *   toast and held the page on the loading spinner, even though the
 *   actual data fetch (`GET /transfers`) would have succeeded.
 *
 * - All privileged actions on this page (Create, Approve, Start transit,
 *   Complete, Cancel, Approve-and-fulfill) are individually gated with
 *   `<Can perm="…">` wrappers inside `TransfersPage` and on the
 *   corresponding API routes, so dropping the page-level gate does not
 *   expose any action a user couldn't already attempt.
 */
export default function Transfers() {
  return <TransfersPage />;
}
