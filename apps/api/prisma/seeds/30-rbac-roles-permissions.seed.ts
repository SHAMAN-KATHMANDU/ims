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
 * - TENANT_ADMIN: every tenant-scoped permission (all modules except SETTINGS.ADMINISTRATOR)
 * - EDITOR: Website content + inventory view (WEBSITE.*, INVENTORY.PRODUCTS.VIEW)
 * - STAFF: Read-only permissions (VIEW actions only)
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

  for (const user of users) {
    let targetRoleName: string;
    if (user.role === "superAdmin") {
      targetRoleName = "TENANT_ADMIN";
    } else if (user.role === "admin") {
      targetRoleName = "EDITOR";
    } else {
      targetRoleName = "STAFF";
    }

    const roleId = roleMap.get(targetRoleName);
    if (!roleId) {
      throw new Error(`Role ${targetRoleName} not found`);
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
