import type { PrismaClient } from "@prisma/client";
import type { SeedContext } from "./types";

export async function seedNotifications(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const userId = ctx.userIds["admin"] ?? Object.values(ctx.userIds)[0];
  if (!userId) return ctx;

  const notifications = [
    {
      type: "TASK_DUE" as const,
      title: "Task due soon",
      message: "Follow up with Ram Sharma is due in 3 days",
      resourceType: "task",
      resourceId: ctx.taskIds[0],
    },
    {
      type: "DEAL_STAGE_CHANGE" as const,
      title: "Deal won",
      message: "Epsilon - Enterprise Deal moved to Closed Won",
      resourceType: "deal",
      resourceId: ctx.dealIds[1],
    },
    {
      type: "LEAD_ASSIGNMENT" as const,
      title: "New lead assigned",
      message: "New Prospect Alpha assigned to you",
      resourceType: "lead",
      resourceId: ctx.leadIds[0],
    },
  ];

  await prisma.notification.deleteMany({ where: { userId } });
  for (const n of notifications) {
    if (!n.resourceId) continue;
    await prisma.notification.create({
      data: {
        userId,
        type: n.type,
        title: n.title,
        message: n.message,
        resourceType: n.resourceType,
        resourceId: n.resourceId,
      },
    });
  }
  return ctx;
}
