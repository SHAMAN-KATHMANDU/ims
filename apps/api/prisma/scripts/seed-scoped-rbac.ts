/**
 * Migration backfill helper — derives system role bitsets from the permission catalog.
 * Used during Phase 1 to seed the initial Role records for each tenant.
 *
 * This script:
 * 1. Computes bitsets for 4 system roles (Platform Admin, Super Admin, Admin, Member)
 * 2. For each existing tenant, creates the WORKSPACE Resource (idempotent)
 * 3. Upserts the 4 system roles with computed bitsets
 * 4. Migrates User.role assignments to UserRole rows
 *
 * Wrapped in transactions for atomicity.
 */

import prisma from "@/config/prisma";
import {
  PERMISSIONS,
  PERMISSION_BY_KEY,
  ADMINISTRATOR_BIT,
} from "@/../../packages/shared/src/permissions/catalog";
import { EMPTY_BITSET, setBit } from "@/shared/permissions/bitset";

/**
 * Build the bitset for a legacy role based on the permission catalog.
 */
export function buildSystemRoleBitset(
  legacyRole: "platformAdmin" | "superAdmin" | "admin" | "user",
): Buffer {
  const buf = EMPTY_BITSET();

  switch (legacyRole) {
    case "platformAdmin":
    case "superAdmin":
      // Both grant ADMINISTRATOR
      setBit(buf, ADMINISTRATOR_BIT);
      break;

    case "admin":
      // Every bit EXCEPT dangerous SETTINGS perms and ADMINISTRATOR
      const dangerousSettingsKeys = [
        "SETTINGS.USERS.FORCE_LOGOUT",
        "SETTINGS.AUDIT.PURGE",
        "SETTINGS.WEBHOOKS.ROTATE_SECRET",
        "SETTINGS.API_ACCESS.ROTATE_KEY",
        "SETTINGS.TENANT.UPDATE_PLAN",
        "SETTINGS.MEMBERS.REVOKE",
      ];

      for (const perm of PERMISSIONS) {
        if (perm.key === "SETTINGS.ADMINISTRATOR") continue;
        if (dangerousSettingsKeys.includes(perm.key)) continue;
        setBit(buf, perm.bit);
      }
      break;

    case "user":
      // Every *.VIEW bit only
      for (const perm of PERMISSIONS) {
        if (perm.action === "VIEW" || perm.action === "VIEW_OWN_ONLY") {
          setBit(buf, perm.bit);
        }
      }
      break;
  }

  return buf;
}

/**
 * Seed system roles for a single tenant and migrate User.role assignments.
 */
async function seedTenantRoles(tenantId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 1. Create WORKSPACE Resource (idempotent)
    const workspaceResource = await tx.resource.upsert({
      where: {
        tenantId_type_externalId: {
          tenantId,
          type: "WORKSPACE",
          externalId: null,
        },
      },
      create: {
        tenantId,
        type: "WORKSPACE",
        externalId: null,
        parentId: null,
        path: "/root/",
        depth: 0,
      },
      update: {},
    });

    // 2. Upsert system roles
    const systemRoles = [
      {
        legacy: "platformAdmin" as const,
        name: "Platform Admin",
        priority: 10000,
      },
      {
        legacy: "superAdmin" as const,
        name: "Super Admin",
        priority: 1000,
      },
      {
        legacy: "admin" as const,
        name: "Admin",
        priority: 900,
      },
      {
        legacy: "user" as const,
        name: "Member",
        priority: 100,
      },
    ];

    const roleMap = new Map<string, { id: string; name: string }>();

    for (const sysRole of systemRoles) {
      const bitset = buildSystemRoleBitset(sysRole.legacy);

      const role = await tx.role.upsert({
        where: {
          tenantId_name: {
            tenantId,
            name: sysRole.name,
          },
        },
        create: {
          tenantId,
          name: sysRole.name,
          priority: sysRole.priority,
          permissions: bitset,
          isSystem: true,
        },
        update: {
          permissions: bitset,
          isSystem: true,
        },
      });

      roleMap.set(sysRole.legacy, { id: role.id, name: role.name });
    }

    // 3. Migrate User.role assignments to UserRole rows
    const users = await tx.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        role: true,
      },
    });

    for (const user of users) {
      const roleKey = user.role as
        | "platformAdmin"
        | "superAdmin"
        | "admin"
        | "user";
      const systemRole = roleMap.get(roleKey);

      if (systemRole) {
        // Upsert UserRole (idempotent on userId+roleId)
        await tx.userRole.upsert({
          where: {
            userId_roleId: {
              userId: user.id,
              roleId: systemRole.id,
            },
          },
          create: {
            userId: user.id,
            roleId: systemRole.id,
            tenantId,
            assignedAt: new Date(),
            assignedBy: null, // System assignment, no "by" user
          },
          update: {
            assignedAt: new Date(),
          },
        });
      }
    }
  });
}

/**
 * Main backfill routine — runs for all tenants.
 * Called during the migration phase or as a one-time backfill.
 */
export async function runBackfill(): Promise<void> {
  console.log("Starting SCOPED RBAC backfill...");

  const tenants = await prisma.tenant.findMany({
    select: { id: true, slug: true },
  });

  for (const tenant of tenants) {
    try {
      console.log(`  Backfilling tenant: ${tenant.slug} (${tenant.id})`);
      await seedTenantRoles(tenant.id);
      console.log(`    ✓ Done`);
    } catch (error) {
      console.error(`    ✗ Failed: ${error}`);
      throw error;
    }
  }

  console.log("SCOPED RBAC backfill complete.");
}

// Run if invoked directly
if (require.main === module) {
  runBackfill()
    .then(() => {
      console.log("Success");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error:", err);
      process.exit(1);
    });
}
