import type { PrismaClient } from "@prisma/client";
import { deterministicId } from "./utils";
import { addDays } from "./utils";
import type { SeedContext } from "./types";

const now = new Date();

const TASK_SPECS: Array<{
  title: string;
  dueDateOffsetDays: number;
  completed: boolean;
  contactIndex?: number;
  dealIndex?: number;
}> = [
  {
    title: "Follow up with Ram Sharma",
    dueDateOffsetDays: 3,
    completed: false,
    contactIndex: 0,
    dealIndex: 0,
  },
  {
    title: "Send proposal to Beta Solutions",
    dueDateOffsetDays: 5,
    completed: false,
    dealIndex: 3,
  },
  {
    title: "Call Bikash Rai",
    dueDateOffsetDays: -1,
    completed: true,
    contactIndex: 4,
  },
  {
    title: "Review Epsilon contract",
    dueDateOffsetDays: 0,
    completed: true,
    dealIndex: 1,
  },
  {
    title: "Schedule demo with Acme",
    dueDateOffsetDays: 7,
    completed: false,
    contactIndex: 0,
  },
];

export async function seedTasks(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<SeedContext> {
  const assignedToId = ctx.userIds["admin"] ?? Object.values(ctx.userIds)[0];
  if (!assignedToId) throw new Error("seedUsers must run before seedTasks");

  const taskIds: string[] = [];
  for (let i = 0; i < TASK_SPECS.length; i++) {
    const t = TASK_SPECS[i];
    const contactId =
      t.contactIndex !== undefined && t.contactIndex < ctx.contactIds.length
        ? ctx.contactIds[t.contactIndex]
        : null;
    const dealId =
      t.dealIndex !== undefined && t.dealIndex < ctx.dealIds.length
        ? ctx.dealIds[t.dealIndex]
        : null;

    const id = deterministicId("task", `${ctx.tenantId}:${i}:${t.title}`);
    const task = await prisma.task.upsert({
      where: { id },
      create: {
        id,
        tenantId: ctx.tenantId,
        title: t.title,
        dueDate: addDays(now, t.dueDateOffsetDays),
        completed: t.completed,
        contactId,
        dealId,
        assignedToId,
      },
      update: {
        completed: t.completed,
        dueDate: addDays(now, t.dueDateOffsetDays),
      },
    });
    taskIds.push(task.id);
  }
  return { ...ctx, taskIds };
}
