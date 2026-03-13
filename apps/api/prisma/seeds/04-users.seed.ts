import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "./utils";
import type { SeedContext } from "./types";

const DEFAULT_PASSWORD = "test123";

/** User entries: username -> role */
const USER_SPECS: Array<{
  username: string;
  role: "admin" | "superAdmin" | "user";
}> = [
  { username: "admin", role: "admin" },
  { username: "user", role: "user" },
  { username: "staff1", role: "user" },
  { username: "staff2", role: "user" },
  { username: "manager", role: "superAdmin" },
];

/**
 * Seed users for a tenant. Idempotent: upsert by (tenantId, username).
 */
export async function seedUsers(
  prisma: PrismaClient,
  ctx: SeedContext,
  password: string = DEFAULT_PASSWORD,
): Promise<SeedContext> {
  const hashedPassword = await hashPassword(password);
  const userIds: Record<string, string> = {};

  for (const spec of USER_SPECS) {
    const user = await prisma.user.upsert({
      where: {
        tenantId_username: { tenantId: ctx.tenantId, username: spec.username },
      },
      create: {
        tenantId: ctx.tenantId,
        username: spec.username,
        password: hashedPassword,
        role: spec.role,
      },
      update: {
        role: spec.role,
        // do not update password on re-seed for safety
      },
    });
    userIds[spec.username] = user.id;
  }

  return { ...ctx, userIds };
}
