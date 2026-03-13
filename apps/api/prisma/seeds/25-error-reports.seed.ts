import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";

export async function seedErrorReports(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const userId = ctx.userIds["admin"] ?? Object.values(ctx.userIds)[0];
  if (!userId) return ctx;

  const reports = [
    {
      title: "Page load slow on Analytics",
      description: "Analytics page takes >5s to load",
      pageUrl: `/${ctx.slug}/analytics`,
      status: "OPEN" as const,
    },
    {
      title: "Export fails for large dataset",
      description: "CSV export fails when >1000 rows",
      pageUrl: `/${ctx.slug}/sales`,
      status: "REVIEWED" as const,
    },
    {
      title: "Minor UI glitch",
      description: "Button alignment on mobile",
      pageUrl: `/${ctx.slug}/products`,
      status: "RESOLVED" as const,
    },
  ];

  for (const r of reports) {
    await prisma.errorReport.create({
      data: {
        tenantId: ctx.tenantId,
        userId,
        title: r.title,
        description: r.description,
        pageUrl: r.pageUrl,
        status: r.status,
      },
    });
  }
  return ctx;
}
