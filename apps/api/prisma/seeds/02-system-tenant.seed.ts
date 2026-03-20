import type { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "./utils";

export interface SystemTenantResult {
  systemTenantId: string;
  platformAdminUserId: string;
}

/**
 * Create system tenant (slug: system) and platform admin user if not exist.
 * If platform admin exists, updates password when SEED_PLATFORM_ADMIN_PASSWORD
 * no longer matches the stored hash (so changing .env and re-seeding applies).
 */
export async function seedSystemTenant(
  prisma: PrismaClient,
  platformAdminUsername: string,
  platformAdminPassword: string,
): Promise<SystemTenantResult> {
  let systemTenant = await prisma.tenant.findUnique({
    where: { slug: "system" },
  });
  if (!systemTenant) {
    systemTenant = await prisma.tenant.create({
      data: {
        name: "System",
        slug: "system",
        plan: "ENTERPRISE",
        isActive: true,
        isTrial: false,
        subscriptionStatus: "ACTIVE",
      },
    });
    console.log("  ✓ System tenant created");
  } else {
    console.log("  ⏭️ System tenant already exists — not recreating");
  }

  let platformAdmin = await prisma.user.findFirst({
    where: {
      username: platformAdminUsername,
      role: "platformAdmin",
    },
  });
  if (!platformAdmin) {
    const hashedPassword = await hashPassword(platformAdminPassword);
    platformAdmin = await prisma.user.create({
      data: {
        tenantId: systemTenant.id,
        username: platformAdminUsername,
        password: hashedPassword,
        role: "platformAdmin",
      },
    });
    console.log(`  ✓ Platform admin created: ${platformAdminUsername}`);
  } else {
    const matches = await verifyPassword(
      platformAdminPassword,
      platformAdmin.password,
    );
    if (!matches) {
      const hashedPassword = await hashPassword(platformAdminPassword);
      platformAdmin = await prisma.user.update({
        where: { id: platformAdmin.id },
        data: { password: hashedPassword },
      });
      console.log(
        `  ✓ Platform admin password updated from env (${platformAdminUsername})`,
      );
    } else {
      console.log(
        `  ⏭️ Platform admin unchanged (${platformAdminUsername}) — password already matches env`,
      );
    }
  }

  return {
    systemTenantId: systemTenant.id,
    platformAdminUserId: platformAdmin.id,
  };
}
