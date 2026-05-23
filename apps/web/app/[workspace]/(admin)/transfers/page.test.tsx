/**
 * Regression guard for GitHub issue #559.
 *
 * The /transfers route shell must render `<TransfersPage />` directly,
 * NOT wrapped in `<PermissionGate perm="INVENTORY.TRANSFERS.VIEW">`.
 *
 * Background: the page used to be gated by `PermissionGate`. The backing
 * `GET /transfers` endpoint has no `requirePermission` middleware (per the
 * intentional "Phase 3 filterVisible" deferral at `transfer.router.ts:117`)
 * and is already tenant-scoped via `req.user!.tenantId`, so the gate added
 * no isolation — only a failure mode: any legacy `user` whose RBAC seed
 * had not yet linked them to STAFF saw an "Unauthorized" toast plus an
 * infinite loading spinner on the Transfers list (#559, same seed-drift
 * family as #486 / #488 / #530 / #535 / #538-#540).
 *
 * A future "let's add a page-level gate back" PR should fail this test
 * instead of silently resurfacing the same broken UX in production.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

// Stub `<TransfersPage />` so we don't drag the whole feature tree
// (React Query, Zustand, services) into a structural-composition test.
const transfersPageMarker = "transfers-page-marker";
vi.mock("@/features/transfers", () => ({
  TransfersPage: () => <div data-testid={transfersPageMarker} />,
}));

// Spy so a re-introduced wrap fails loudly with the issue number.
const permissionGateSpy = vi.fn(() => null);
vi.mock("@/features/permissions", () => ({
  PermissionGate: permissionGateSpy,
}));

import Transfers from "./page";

describe("/[workspace]/(admin)/transfers/page", () => {
  it("renders <TransfersPage /> directly without a <PermissionGate /> wrap (issue #559)", () => {
    const { getByTestId } = render(<Transfers />);
    expect(getByTestId(transfersPageMarker)).toBeTruthy();
    expect(permissionGateSpy).not.toHaveBeenCalled();
  });
});
