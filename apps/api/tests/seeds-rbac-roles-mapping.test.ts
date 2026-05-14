import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { seedRbacRolesPermissions } from "../prisma/seeds/30-rbac-roles-permissions.seed";
import type { SeedContext } from "../prisma/seeds/types";

type SeededRole = { id: string; name: string };

function buildMockPrisma(initial: {
  users: Array<{ id: string; role: string }>;
  existingUserRoles?: Array<{ userId: string; roleName: string }>;
}) {
  const roles: SeededRole[] = [];
  let nextRoleSerial = 1;

  const userRoles: Array<{ id: string; userId: string; roleId: string }> = [];
  let nextUserRoleSerial = 1;

  const nameByRoleId = (roleId: string) =>
    roles.find((r) => r.id === roleId)?.name ?? "<unknown>";

  // Seed existing user_role links by role name (resolved on first upsert below).
  const pendingExisting = initial.existingUserRoles ?? [];

  const prisma = {
    rbacRole: {
      upsert: vi.fn(
        ({
          where,
          create,
        }: {
          where: { tenantId_name: { tenantId: string; name: string } };
          create: { name: string };
        }) => {
          const name = where.tenantId_name.name;
          const existing = roles.find((r) => r.name === name);
          if (existing) {
            return Promise.resolve({
              ...existing,
              createdAt: new Date(0),
              updatedAt: new Date(1),
            });
          }
          const role: SeededRole = {
            id: `role-${nextRoleSerial++}`,
            name: create.name,
          };
          roles.push(role);

          // Resolve any pending existing user-role links for this role name.
          for (const pending of pendingExisting.filter(
            (p) => p.roleName === name,
          )) {
            userRoles.push({
              id: `ur-${nextUserRoleSerial++}`,
              userId: pending.userId,
              roleId: role.id,
            });
          }

          return Promise.resolve({
            ...role,
            createdAt: new Date(0),
            updatedAt: new Date(0),
          });
        },
      ),
    },
    user: {
      findMany: vi.fn(() => Promise.resolve(initial.users)),
    },
    userRole: {
      findUnique: vi.fn(
        ({
          where,
        }: {
          where: { userId_roleId: { userId: string; roleId: string } };
        }) => {
          const found = userRoles.find(
            (ur) =>
              ur.userId === where.userId_roleId.userId &&
              ur.roleId === where.userId_roleId.roleId,
          );
          return Promise.resolve(found ?? null);
        },
      ),
      create: vi.fn(
        ({ data }: { data: { userId: string; roleId: string } }) => {
          userRoles.push({
            id: `ur-${nextUserRoleSerial++}`,
            userId: data.userId,
            roleId: data.roleId,
          });
          return Promise.resolve({ id: `ur-${nextUserRoleSerial}` });
        },
      ),
      deleteMany: vi.fn(
        ({
          where,
        }: {
          where: { userId: string; roleId: { in: string[] } };
        }) => {
          const before = userRoles.length;
          for (let i = userRoles.length - 1; i >= 0; i--) {
            const ur = userRoles[i]!;
            if (
              ur.userId === where.userId &&
              where.roleId.in.includes(ur.roleId)
            ) {
              userRoles.splice(i, 1);
            }
          }
          return Promise.resolve({ count: before - userRoles.length });
        },
      ),
    },
  } as unknown as PrismaClient;

  return {
    prisma,
    snapshot: () =>
      userRoles.map((ur) => ({
        userId: ur.userId,
        roleName: nameByRoleId(ur.roleId),
      })),
  };
}

const ctx: SeedContext = {
  tenantId: "tenant-test",
} as SeedContext;

describe("seedRbacRolesPermissions — legacy role mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links legacy admin → TENANT_ADMIN (regression for onboarding loop)", async () => {
    const { prisma, snapshot } = buildMockPrisma({
      users: [{ id: "admin-1", role: "admin" }],
    });

    await seedRbacRolesPermissions(prisma, ctx);

    const links = snapshot();
    expect(links).toEqual([{ userId: "admin-1", roleName: "TENANT_ADMIN" }]);
  });

  it("links legacy superAdmin → TENANT_ADMIN", async () => {
    const { prisma, snapshot } = buildMockPrisma({
      users: [{ id: "super-1", role: "superAdmin" }],
    });

    await seedRbacRolesPermissions(prisma, ctx);

    expect(snapshot()).toEqual([
      { userId: "super-1", roleName: "TENANT_ADMIN" },
    ]);
  });

  it("links other legacy roles (e.g. user) → STAFF", async () => {
    const { prisma, snapshot } = buildMockPrisma({
      users: [{ id: "u-1", role: "user" }],
    });

    await seedRbacRolesPermissions(prisma, ctx);

    expect(snapshot()).toEqual([{ userId: "u-1", roleName: "STAFF" }]);
  });

  it("re-runs are corrective: a stale admin → EDITOR link is replaced with TENANT_ADMIN", async () => {
    const { prisma, snapshot } = buildMockPrisma({
      users: [{ id: "admin-1", role: "admin" }],
      existingUserRoles: [{ userId: "admin-1", roleName: "EDITOR" }],
    });

    await seedRbacRolesPermissions(prisma, ctx);

    expect(snapshot()).toEqual([
      { userId: "admin-1", roleName: "TENANT_ADMIN" },
    ]);
  });

  it("does not touch a correct link on re-run (idempotent)", async () => {
    const { prisma, snapshot } = buildMockPrisma({
      users: [{ id: "u-1", role: "user" }],
      existingUserRoles: [{ userId: "u-1", roleName: "STAFF" }],
    });

    await seedRbacRolesPermissions(prisma, ctx);

    expect(snapshot()).toEqual([{ userId: "u-1", roleName: "STAFF" }]);
  });
});
