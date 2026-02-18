import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient();

// Platform admin credentials from .env (see .env.example)
const PLATFORM_ADMIN_USERNAME =
  process.env.SEED_PLATFORM_ADMIN_USERNAME ?? "platform";
const PLATFORM_ADMIN_PASSWORD = process.env.SEED_PLATFORM_ADMIN_PASSWORD;

function requireEnv(name: string, value: string | undefined): string {
  if (!value || !value.trim()) {
    throw new Error(
      `❌ Missing required env: ${name}. Set it in .env (see .env.example).`,
    );
  }
  return value.trim();
}

async function main() {
  console.log("🌱 Starting seed...\n");

  const platformAdminPassword = requireEnv(
    "SEED_PLATFORM_ADMIN_PASSWORD",
    PLATFORM_ADMIN_PASSWORD,
  );

  // 1. System tenant (required for platform admin — User.tenantId is not nullable)
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
    console.log("✅ Created system tenant (for platform admin)");
  }

  // 2. Platform admin user
  let platformAdmin = await prisma.user.findFirst({
    where: {
      username: PLATFORM_ADMIN_USERNAME,
      role: "platformAdmin",
    },
  });
  if (!platformAdmin) {
    const hashedPassword = await bcrypt.hash(platformAdminPassword, 10);
    platformAdmin = await prisma.user.create({
      data: {
        tenantId: systemTenant.id,
        username: PLATFORM_ADMIN_USERNAME,
        password: hashedPassword,
        role: "platformAdmin",
      },
    });
    console.log(`✅ Created platform admin: ${platformAdmin.username}`);
  } else {
    console.log(
      `⚠️  Platform admin "${PLATFORM_ADMIN_USERNAME}" already exists.`,
    );
  }

  console.log("\n✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
