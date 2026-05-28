import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";
import { PERMISSIONS, PERMISSION_BY_KEY } from "@repo/shared";

/**
 * Build a 64-byte bitset (Buffer) by enabling the specified permission keys.
 * Permissions map to bits 0-510; bit 511 is ADMINISTRATOR.
 */
function buildBitset(permissionKeys: readonly string[]): Buffer {
  const bitset = Buffer.alloc(64, 0);

  for (const key of permissionKeys) {
    const perm = PERMISSION_BY_KEY.get(key);
    if (!perm) {
      throw new Error(`Unknown permission key: ${key}`);
    }

    const bit = perm.bit;
    const byteIndex = Math.floor(bit / 8);
    const bitIndex = bit % 8;

    if (byteIndex >= 64) {
      throw new Error(`Bit ${bit} exceeds 64-byte buffer`);
    }

    // Set the bit (LSB first: bit 0 = 0x01, bit 1 = 0x02, etc.)
    bitset[byteIndex] |= 1 << bitIndex;
  }

  return bitset;
}

/**
 * SETTINGS permissions that can wipe state, rotate secrets, change billing, or
 * eject members. Excluded from TENANT_ADMIN; available only to TENANT_SUPER_ADMIN.
 */
const DANGEROUS_SETTINGS_KEYS = new Set<string>([
  "SETTINGS.USERS.FORCE_LOGOUT",
  "SETTINGS.AUDIT.PURGE",
  "SETTINGS.TRASH.PURGE",
  "SETTINGS.WEBHOOKS.ROTATE_SECRET",
  "SETTINGS.API_ACCESS.ROTATE_KEY",
  "SETTINGS.API_ACCESS.REVOKE_KEY",
  "SETTINGS.TENANT.UPDATE_PLAN",
  "SETTINGS.MEMBERS.REVOKE",
]);

/**
 * Seed RBAC roles with permission bitsets. Idempotent: upsert by tenantId + name.
 *
 * Role hierarchy (priority desc):
 * - TENANT_SUPER_ADMIN: every permission including SETTINGS.ADMINISTRATOR and
 *   the destructive SETTINGS keys (rotate secrets, purge audit/trash, update
 *   plan, revoke members, force logout). Auto-assigned to legacy `superAdmin`.
 * - TENANT_ADMIN: every permission except SETTINGS.ADMINISTRATOR and the
 *   destructive SETTINGS keys above. Auto-assigned to legacy `admin`.
 * - EDITOR: Website content + inventory product view. Opt-in only.
 * - STAFF: Full CRUD across INVENTORY, SALES, CRM (operational work) plus
 *   VIEW-only on WEBSITE, REPORTS, and SETTINGS. Auto-assigned to legacy
 *   `user` and any other legacy role.
 */
export async function seedRbacRolesPermissions(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const tenantId = ctx.tenantId;

  // TENANT_SUPER_ADMIN: every permission, no exclusions.
  const tenantSuperAdminKeys = PERMISSIONS.map((p) => p.key);

  // TENANT_ADMIN: everything except SETTINGS.ADMINISTRATOR and destructive
  // SETTINGS keys (kept exclusive to TENANT_SUPER_ADMIN).
  const tenantAdminKeys = PERMISSIONS.filter(
    (p) =>
      p.key !== "SETTINGS.ADMINISTRATOR" && !DANGEROUS_SETTINGS_KEYS.has(p.key),
  ).map((p) => p.key);

  // EDITOR: Website + inventory product view.
  const editorKeys = [
    ...PERMISSIONS.filter((p) => p.module === "WEBSITE").map((p) => p.key),
    "INVENTORY.PRODUCTS.VIEW",
  ];

  // STAFF: full CRUD on INVENTORY/SALES/CRM, VIEW elsewhere. Mirrors what
  // legacy `user` accounts could do via the pre-RBAC backend (CRM routers
  // explicitly allowed `user`; sales/inventory routers had no role gate at
  // all). VIEW on WEBSITE/REPORTS/SETTINGS lets staff browse those surfaces
  // without editing.
  const operationalModules = new Set(["INVENTORY", "SALES", "CRM"]);
  const readOnlyModules = new Set(["WEBSITE", "REPORTS", "SETTINGS"]);
  const staffKeys = PERMISSIONS.filter(
    (p) =>
      operationalModules.has(p.module) ||
      (readOnlyModules.has(p.module) &&
        (p.action === "VIEW" || p.action === "VIEW_OWN_ONLY")),
  ).map((p) => p.key);

  const roleSpecs: Array<{
    name: string;
    priority: number;
    keys: string[];
    color: string;
  }> = [
    {
      name: "TENANT_SUPER_ADMIN",
      priority: 200,
      keys: tenantSuperAdminKeys,
      color: "red",
    },
    { name: "TENANT_ADMIN", priority: 100, keys: tenantAdminKeys, color: "blue" },
    { name: "EDITOR", priority: 50, keys: editorKeys, color: "gray" },
    { name: "STAFF", priority: 25, keys: staffKeys, color: "gray" },
  ];

  let createdCount = 0;
  let linkedCount = 0;

  // Create or update roles
  const roleMap = new Map<string, string>(); // name -> roleId
  for (const spec of roleSpecs) {
    const bitset = buildBitset(spec.keys);
    const role = await prisma.rbacRole.upsert({
      where: {
        tenantId_name: { tenantId, name: spec.name },
      },
      create: {
        tenantId,
        name: spec.name,
        priority: spec.priority,
        permissions: bitset,
        isSystem: true,
        color: spec.color,
      },
      update: {
        permissions: bitset,
        priority: spec.priority,
      },
    });
    roleMap.set(spec.name, role.id);
    if (
      role.createdAt &&
      role.createdAt.getTime() === role.updatedAt.getTime()
    ) {
      createdCount++;
    }
  }

  // Link users to roles based on their legacy User.role
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, role: true },
  });

  const tenantSuperAdminRoleId = roleMap.get("TENANT_SUPER_ADMIN");
  const tenantAdminRoleId = roleMap.get("TENANT_ADMIN");
  const editorRoleId = roleMap.get("EDITOR");
  const staffRoleId = roleMap.get("STAFF");

  for (const user of users) {
    let targetRoleName: string;
    if (user.role === "superAdmin") {
      targetRoleName = "TENANT_SUPER_ADMIN";
    } else if (user.role === "admin") {
      targetRoleName = "TENANT_ADMIN";
    } else {
      targetRoleName = "STAFF";
    }

    const roleId = roleMap.get(targetRoleName);
    if (!roleId) {
      throw new Error(`Role ${targetRoleName} not found`);
    }

    // Drop any stale system-role link before linking to the correct one. An
    // earlier version of this seed mapped legacy `admin` → `EDITOR`, which
    // stripped tenant admins of locations / sales / CRM / dashboard perms
    // (#540, #539, #538, #535, #530, #488, #486). The cleanup also covers the
    // tier change introduced when TENANT_SUPER_ADMIN was split out of
    // TENANT_ADMIN — promoted/demoted users get their old link removed.
    const staleRoleIds = [
      tenantSuperAdminRoleId,
      tenantAdminRoleId,
      editorRoleId,
      staffRoleId,
    ].filter((id): id is string => typeof id === "string" && id !== roleId);
    if (staleRoleIds.length > 0) {
      await prisma.userRole.deleteMany({
        where: {
          userId: user.id,
          tenantId,
          roleId: { in: staleRoleIds },
        },
      });
    }

    const existing = await prisma.userRole.findUnique({
      where: {
        userId_roleId: { userId: user.id, roleId },
      },
    });

    if (!existing) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId,
          tenantId,
        },
      });
      linkedCount++;
    }
  }

  console.log(
    `  ✓ RBAC roles: created ${createdCount} roles, linked ${linkedCount} users`,
  );
  return ctx;
}
