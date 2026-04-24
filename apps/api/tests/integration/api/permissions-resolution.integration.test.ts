/**
 * Integration tests: RBAC permission resolution engine.
 *
 * Tests the full ancestor-chain resolution with real PermissionService logic
 * and mocked repository/cache — no DB required.
 *
 * Scenario:
 *   - Resource hierarchy: WORKSPACE (R0) → Pipeline (R1) → Deal (R2)
 *   - Two custom roles:
 *       "Member"     — CRM.DEALS.VIEW + CRM.CONTACTS.VIEW only
 *       "Sales Lead" — CRM.DEALS.{VIEW,CREATE,UPDATE,ASSIGN} + CRM.LEADS.*
 *                      (intentionally excludes CRM.DEALS.DELETE from base)
 *   - User Alice has BOTH roles
 *   - Overwrite on R1: Sales Lead role explicitly allows CRM.DEALS.DELETE
 *   - Overwrite on R2: Alice user is explicitly denied CRM.DEALS.UPDATE
 *
 * Expected results at R2:
 *   can('CRM.DEALS.DELETE') → true  (granted by R1 role overwrite, inherited)
 *   can('CRM.DEALS.UPDATE') → false (denied by R2 user overwrite)
 *   can('CRM.DEALS.VIEW')   → true  (in base mask, not denied)
 *   can('CRM.CONTACTS.VIEW')→ true  (in Member role base mask)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionService } from "@/modules/permissions/permission.service";
import { permissionRepository } from "@/modules/permissions/permission.repository";
import { permissionCache } from "@/modules/permissions/permission.cache";
import { EMPTY_BITSET, setBit } from "@/shared/permissions/bitset";
import { PERMISSION_BY_KEY } from "@repo/shared";

vi.mock("@/modules/permissions/permission.repository");
vi.mock("@/modules/permissions/permission.cache");

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_ID = "tenant-test-0000-0000-0000-000000000001";
const ALICE_ID = "user-alice-0000-0000-0000-000000000001";
const ROLE_MEMBER_ID = "role-member-0000-0000-0000-000000000001";
const ROLE_SALES_LEAD_ID = "role-saleslead-000-0000-0000-000000000001";

const R0_WORKSPACE = "resource-r0-ws-000-0000-0000-000000000001";
const R1_PIPELINE = "resource-r1-pip-000-0000-0000-000000000001";
const R2_DEAL = "resource-r2-deal-00-0000-0000-000000000001";

// Permission bits from the catalog
const BIT = (key: string) => PERMISSION_BY_KEY.get(key)!.bit;

// ─── Role bitset builders ─────────────────────────────────────────────────────

/** Member role: CRM.DEALS.VIEW + CRM.CONTACTS.VIEW */
function memberPerms(): Buffer {
  const buf = EMPTY_BITSET();
  setBit(buf, BIT("CRM.DEALS.VIEW"));
  setBit(buf, BIT("CRM.CONTACTS.VIEW"));
  return buf;
}

/**
 * Sales Lead role: CRM.DEALS.{VIEW, CREATE, UPDATE, ASSIGN} + CRM.LEADS.*
 * Intentionally does NOT include CRM.DEALS.DELETE so the overwrite on R1
 * is the source of that permission.
 */
function salesLeadPerms(): Buffer {
  const buf = EMPTY_BITSET();
  setBit(buf, BIT("CRM.DEALS.VIEW"));
  setBit(buf, BIT("CRM.DEALS.CREATE"));
  setBit(buf, BIT("CRM.DEALS.UPDATE"));
  setBit(buf, BIT("CRM.DEALS.ASSIGN"));
  // CRM.LEADS.*
  setBit(buf, BIT("CRM.LEADS.VIEW"));
  setBit(buf, BIT("CRM.LEADS.CREATE"));
  setBit(buf, BIT("CRM.LEADS.UPDATE"));
  return buf;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Permission resolution: ancestor-chain inheritance with overwrites", () => {
  let service: PermissionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PermissionService();

    // Cache always misses so every call exercises the resolution logic
    vi.mocked(permissionCache.get).mockResolvedValue(null);
    vi.mocked(permissionCache.set).mockResolvedValue(undefined);

    // Alice has both roles (Sales Lead has higher priority)
    vi.mocked(permissionRepository.getUserRoles).mockResolvedValue([
      {
        id: ROLE_SALES_LEAD_ID,
        permissions: salesLeadPerms(),
        priority: 200,
      },
      {
        id: ROLE_MEMBER_ID,
        permissions: memberPerms(),
        priority: 100,
      },
    ]);

    // Full ancestor chain for R2 (root-to-leaf order)
    vi.mocked(permissionRepository.getResourceChain).mockResolvedValue([
      { id: R0_WORKSPACE, path: `/${R0_WORKSPACE}/`, depth: 0 },
      {
        id: R1_PIPELINE,
        path: `/${R0_WORKSPACE}/${R1_PIPELINE}/`,
        depth: 1,
      },
      {
        id: R2_DEAL,
        path: `/${R0_WORKSPACE}/${R1_PIPELINE}/${R2_DEAL}/`,
        depth: 2,
      },
    ]);
  });

  /**
   * Shared helper: set up the standard overwrites and return can() result.
   */
  async function setupAndCheck(permKey: string): Promise<boolean> {
    // R1 overwrite: Sales Lead role allows CRM.DEALS.DELETE
    const r1RoleAllow = EMPTY_BITSET();
    setBit(r1RoleAllow, BIT("CRM.DEALS.DELETE"));

    // R2 overwrite: Alice user is denied CRM.DEALS.UPDATE
    const r2UserDeny = EMPTY_BITSET();
    setBit(r2UserDeny, BIT("CRM.DEALS.UPDATE"));

    vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([
      {
        resourceId: R1_PIPELINE,
        roleId: ROLE_SALES_LEAD_ID,
        userId: null,
        allow: r1RoleAllow,
        deny: EMPTY_BITSET(),
      },
      {
        resourceId: R2_DEAL,
        roleId: null,
        userId: ALICE_ID,
        allow: EMPTY_BITSET(),
        deny: r2UserDeny,
      },
    ]);

    return service.can(TENANT_ID, ALICE_ID, R2_DEAL, permKey);
  }

  it("can('CRM.DEALS.DELETE') → true (granted by R1 role overwrite, inherited by R2)", async () => {
    const result = await setupAndCheck("CRM.DEALS.DELETE");
    expect(result).toBe(true);
  });

  it("can('CRM.DEALS.UPDATE') → false (explicitly denied by user overwrite on R2)", async () => {
    const result = await setupAndCheck("CRM.DEALS.UPDATE");
    expect(result).toBe(false);
  });

  it("can('CRM.DEALS.VIEW') → true (in base mask, not denied by any overwrite)", async () => {
    const result = await setupAndCheck("CRM.DEALS.VIEW");
    expect(result).toBe(true);
  });

  it("can('CRM.CONTACTS.VIEW') → true (in Member role base mask)", async () => {
    const result = await setupAndCheck("CRM.CONTACTS.VIEW");
    expect(result).toBe(true);
  });

  it("can('CRM.DEALS.DELETE') → false when R1 overwrite is absent (not in base mask)", async () => {
    // No overwrites at all → Sales Lead base mask doesn't include DELETE
    vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([]);

    const result = await service.can(
      TENANT_ID,
      ALICE_ID,
      R2_DEAL,
      "CRM.DEALS.DELETE",
    );
    expect(result).toBe(false);
  });

  it("user overwrite deny takes precedence over role base mask at same node", async () => {
    // Give Alice a user deny for CRM.DEALS.CREATE at R2 (which her Sales Lead
    // role grants in the base mask).
    const r2UserDeny = EMPTY_BITSET();
    setBit(r2UserDeny, BIT("CRM.DEALS.CREATE"));

    vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([
      {
        resourceId: R2_DEAL,
        roleId: null,
        userId: ALICE_ID,
        allow: EMPTY_BITSET(),
        deny: r2UserDeny,
      },
    ]);

    // CREATE was in base mask (Sales Lead) but denied by user overwrite at R2
    const result = await service.can(
      TENANT_ID,
      ALICE_ID,
      R2_DEAL,
      "CRM.DEALS.CREATE",
    );
    expect(result).toBe(false);
  });

  it("role overwrite on R1 allows a permission that role deny removes and re-allows via the formula", async () => {
    // Role overwrite on R1: deny=UPDATE + allow=UPDATE
    // Formula: perms = (perms AND_NOT deny) OR allow → UPDATE bit is SET (allow wins)
    const r1Allow = EMPTY_BITSET();
    setBit(r1Allow, BIT("CRM.DEALS.UPDATE"));
    const r1Deny = EMPTY_BITSET();
    setBit(r1Deny, BIT("CRM.DEALS.UPDATE"));

    vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([
      {
        resourceId: R1_PIPELINE,
        roleId: ROLE_SALES_LEAD_ID,
        userId: null,
        allow: r1Allow,
        deny: r1Deny,
      },
    ]);

    // allow wins at the same overwrite: bit is SET after (AND_NOT deny) then (OR allow)
    const result = await service.can(
      TENANT_ID,
      ALICE_ID,
      R2_DEAL,
      "CRM.DEALS.UPDATE",
    );
    expect(result).toBe(true);
  });

  it("overwrites cache the result for subsequent calls", async () => {
    vi.mocked(permissionRepository.getOverwritesForChain).mockResolvedValue([]);

    await service.getEffectivePermissions(TENANT_ID, ALICE_ID, R2_DEAL);

    expect(permissionCache.set).toHaveBeenCalledWith(
      TENANT_ID,
      ALICE_ID,
      R2_DEAL,
      expect.any(Buffer),
    );
  });
});
