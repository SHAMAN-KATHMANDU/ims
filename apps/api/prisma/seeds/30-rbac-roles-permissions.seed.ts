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
 * Collect all permission keys for a given module, action, or filter.
 */
function getPermissionKeysForModule(module: string): string[] {
  return PERMISSIONS.filter((p) => p.module === module).map((p) => p.key);
}

function getPermissionKeysForAction(action: string): string[] {
  return PERMISSIONS.filter((p) => p.action === action).map((p) => p.key);
}

/**
 * Seed RBAC roles with permission bitsets. Idempotent: upsert by tenantId + name.
 *
 * Role hierarchy:
 * - TENANT_ADMIN: every tenant-scoped permission (all modules except SETTINGS.ADMINISTRATOR).
 *   Auto-assigned to legacy `User.role` values `admin` and `superAdmin`.
 * - EDITOR: Website content + inventory view (WEBSITE.*, INVENTORY.PRODUCTS.VIEW).
 *   Opt-in only — never auto-assigned from legacy `User.role`.
 * - STAFF: Read-only permissions (VIEW actions only).
 *   Auto-assigned to all other legacy `User.role` values (e.g. `user`).
 */
export async function seedRbacRolesPermissions(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const tenantId = ctx.tenantId;

  // TENANT_ADMIN: every permission except SETTINGS.ADMINISTRATOR
  const tenantAdminKeys = PERMISSIONS.filter(
    (p) => p.key !== "SETTINGS.ADMINISTRATOR",
  ).map((p) => p.key);

  // EDITOR: Website + inventory product view
  const editorKeys = [
    ...getPermissionKeysForModule("WEBSITE"),
    "INVENTORY.PRODUCTS.VIEW",
  ];

  // STAFF: VIEW-only permissions across all modules
  const staffKeys = [...getPermissionKeysForAction("VIEW")];

  const roleSpecs: Array<{
    name: string;
    priority: number;
    keys: string[];
  }> = [
    { name: "TENANT_ADMIN", priority: 100, keys: tenantAdminKeys },
    { name: "EDITOR", priority: 50, keys: editorKeys },
    { name: "STAFF", priority: 25, keys: staffKeys },
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
        color: spec.name === "TENANT_ADMIN" ? "blue" : "gray",
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

  const editorRoleId = roleMap.get("EDITOR");
  const staffRoleId = roleMap.get("STAFF");
  const tenantAdminRoleId = roleMap.get("TENANT_ADMIN");

  for (const user of users) {
    let targetRoleName: string;
    if (user.role === "superAdmin" || user.role === "admin") {
      targetRoleName = "TENANT_ADMIN";
    } else {
      targetRoleName = "STAFF";
    }

    const roleId = roleMap.get(targetRoleName);
    if (!roleId) {
      throw new Error(`Role ${targetRoleName} not found`);
    }

    // Repair: an earlier version of this seed mapped legacy `admin` →
    // `EDITOR`, which stripped tenant admins of locations / sales / CRM /
    // dashboard permissions and produced the onboarding loop + Forbidden
    // toasts (#540, #539, #538, #535, #530, #488, #486). Drop any stale link
    // from the wrong RBAC role before the upsert below re-links to the right
    // one. Only stale links are removed — the user's correct role link (if
    // already present from this run) is preserved by the `not` clause.
    const staleRoleIds = [editorRoleId, staffRoleId, tenantAdminRoleId].filter(
      (id): id is string => typeof id === "string" && id !== roleId,
    );
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
