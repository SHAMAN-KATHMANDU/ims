/**
 * Regression: `/dashboard/user-summary` must remain auth-only — no RBAC
 * permission middleware in front of it.
 *
 * Background (issue #530): when the route was guarded by
 *   requirePermission("REPORTS.DASHBOARD.PERSONAL_VIEW", workspaceLocator())
 * any legacy `user` whose RBAC seed had not yet linked them to STAFF got a
 * 403 "Forbidden" toast on the user dashboard. The data is intrinsically
 * personal — `getUserSummary(userId)` derives `userId` from the JWT and
 * every underlying query is scoped to that userId — so the permission gate
 * added no isolation, only a failure mode tied to seed drift.
 *
 * This test introspects the registered route stack so a future
 * "drive-by re-add" of `requirePermission` to this route fails loudly
 * instead of resurfacing the same Forbidden toast in production.
 */

import { describe, it, expect } from "vitest";
import type { RequestHandler } from "express";
import dashboardRouter from "./dashboard.router";

type Layer = {
  route?: {
    path: string;
    stack: Array<{ handle: RequestHandler; name?: string }>;
  };
};

function findRouteStack(path: string): Array<{ name?: string }> {
  const stack = (dashboardRouter as unknown as { stack: Layer[] }).stack;
  const layer = stack.find((l) => l.route?.path === path);
  if (!layer?.route) {
    throw new Error(`Route ${path} not registered on dashboardRouter`);
  }
  return layer.route.stack.map((h) => ({ name: h.handle.name }));
}

describe("dashboardRouter middleware contract", () => {
  it("/user-summary has no requirePermission middleware (issue #530)", () => {
    const handlers = findRouteStack("/user-summary");

    // The current shape is exactly one handler — the asyncHandler wrapper
    // around dashboardController.getUserSummary. If a future change adds
    // any middleware here, surface it so the author considers whether it
    // can produce a "Forbidden" toast for a legacy `user` with a stale
    // RBAC seed.
    expect(handlers).toHaveLength(1);
    expect(handlers.some((h) => h.name?.includes("requirePermission"))).toBe(
      false,
    );
  });

  it("/admin-summary keeps its requirePermission gate", () => {
    const handlers = findRouteStack("/admin-summary");
    // Sanity check: admin/superadmin endpoints are explicitly perm-gated
    // and that does NOT change with this fix — only the personal route
    // (which is JWT-scoped to the caller) is freed.
    expect(handlers.length).toBeGreaterThan(1);
  });

  it("/superadmin-summary keeps its requirePermission gate", () => {
    const handlers = findRouteStack("/superadmin-summary");
    expect(handlers.length).toBeGreaterThan(1);
  });
});
