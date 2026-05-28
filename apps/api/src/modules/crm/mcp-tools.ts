/**
 * MCP Analytics Tools for CRM Module
 *
 * Five analytics tools for CRM data analysis with automatic tenant scoping.
 * Do not edit mcp.server.ts — just call registerCrmAnalyticsTools(server, authCtx)
 * from there.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import prisma from "@/config/prisma";
import type { McpAuthContext } from "@/modules/mcp/mcp.server";

export function registerCrmAnalyticsTools(
  server: McpServer,
  authCtx: McpAuthContext,
) {
  // Bypass TS2589 deep-inference via loose signature alias (see mcp.server.ts lines 34-42)
  const registerTool = server.registerTool.bind(server) as (
    name: string,
    config: {
      title?: string;
      description?: string;
      inputSchema?: Record<string, z.ZodTypeAny>;
    },
    handler: (args: any) => Promise<unknown> | unknown,
  ) => unknown;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. crm_staff_activity
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "crm_staff_activity",
    {
      title: "Staff activity breakdown",
      description:
        "Per-user breakdown of activities created within a date range, including activity counts by type and relative-time buckets (today, yesterday).",
      inputSchema: {
        from: z.string().describe("ISO date (inclusive, lower bound)"),
        to: z.string().describe("ISO date (exclusive, upper bound)"),
      },
    },
    async ({ from, to }) => {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      // Get users and their activity counts
      const activities = await prisma.activity.groupBy({
        by: ["createdById"],
        where: {
          tenantId: authCtx.tenantId,
          deletedAt: null,
          createdAt: {
            gte: fromDate,
            lt: toDate,
          },
        },
        _count: true,
      });

      // Get detailed activity data to calculate by-type breakdown
      const detailedActivities = await prisma.activity.findMany({
        where: {
          tenantId: authCtx.tenantId,
          deletedAt: null,
          createdAt: {
            gte: fromDate,
            lt: toDate,
          },
        },
        select: {
          createdById: true,
          type: true,
          createdAt: true,
        },
      });

      // Get user info for all users who created activities
      const userIds = activities.map((a) => a.createdById);
      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          deletedAt: null,
        },
        select: {
          id: true,
          username: true,
        },
      });

      const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));

      // Build result with activity breakdown by type and time bucket
      const result = userIds.map((userId) => {
        const userActivities = detailedActivities.filter(
          (a) => a.createdById === userId,
        );

        const byType = {
          CALL: userActivities.filter((a) => a.type === "CALL").length,
          EMAIL: userActivities.filter((a) => a.type === "EMAIL").length,
          MEETING: userActivities.filter((a) => a.type === "MEETING").length,
        };

        // Calculate today and yesterday relative to the 'to' date
        const referenceDate = toDate;
        const dayAgo = new Date(referenceDate);
        dayAgo.setDate(dayAgo.getDate() - 1);
        const twoDaysAgo = new Date(referenceDate);
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const todayCount = userActivities.filter((a) => {
          const actDate = new Date(a.createdAt);
          return actDate >= dayAgo && actDate < referenceDate;
        }).length;

        const yesterdayCount = userActivities.filter((a) => {
          const actDate = new Date(a.createdAt);
          return actDate >= twoDaysAgo && actDate < dayAgo;
        }).length;

        return {
          userId,
          username: userMap[userId] || "Unknown",
          totalActivities: userActivities.length,
          byType,
          todayCount,
          yesterdayCount,
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 2. crm_deals_by_stage
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "crm_deals_by_stage",
    {
      title: "Deals by stage and stalled analysis",
      description:
        "List deals grouped by stage with value totals. Identify 'stalled' deals where updatedAt is beyond the threshold. " +
        "Note: Uses Deal.updatedAt as proxy for time-in-stage — moves on any deal edit, not just stage changes.",
      inputSchema: {
        stuckThresholdDays: z
          .number()
          .int()
          .min(1)
          .max(90)
          .default(7)
          .describe("Days since last update to mark a deal as stalled"),
        status: z
          .enum(["OPEN", "WON", "LOST"])
          .optional()
          .default("OPEN")
          .describe("Filter deals by status"),
      },
    },
    async ({ stuckThresholdDays, status }) => {
      const now = new Date();
      const stalledThresholdDate = new Date(now);
      stalledThresholdDate.setDate(
        stalledThresholdDate.getDate() - stuckThresholdDays,
      );

      // Get deals grouped by stage
      const dealsByStage = await prisma.deal.groupBy({
        by: ["stage"],
        where: {
          tenantId: authCtx.tenantId,
          deletedAt: null,
          isLatest: true,
          status: status || "OPEN",
        },
        _count: true,
        _sum: { value: true },
      });

      // Get stalled deals (updatedAt before threshold)
      const stalledDeals = await prisma.deal.findMany({
        where: {
          tenantId: authCtx.tenantId,
          deletedAt: null,
          isLatest: true,
          status: status || "OPEN",
          updatedAt: {
            lt: stalledThresholdDate,
          },
        },
        select: {
          id: true,
          name: true,
          stage: true,
          value: true,
          updatedAt: true,
          assignedTo: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      // Calculate days since update for stalled deals
      const stalledResult = stalledDeals.map((deal) => {
        const daysSinceUpdate = Math.floor(
          (now.getTime() - deal.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          dealId: deal.id,
          name: deal.name,
          stage: deal.stage,
          value: deal.value.toString(),
          daysSinceUpdate,
          assignedTo: deal.assignedTo
            ? {
                id: deal.assignedTo.id,
                username: deal.assignedTo.username,
              }
            : null,
        };
      });

      const byStageResult = dealsByStage.map((group) => ({
        stage: group.stage,
        count: group._count,
        totalValue: group._sum?.value?.toString() ?? "0",
      }));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                byStage: byStageResult,
                stalled: stalledResult,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 3. crm_overdue_tasks
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "crm_overdue_tasks",
    {
      title: "Overdue tasks",
      description:
        "List tasks past their due date, excluding completed and cancelled ones, optionally filtered by assignee.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .default(100)
          .describe("Maximum tasks to return"),
        assignedToId: z
          .string()
          .optional()
          .describe("Optional user id to filter tasks assigned to this user"),
      },
    },
    async ({ limit, assignedToId }) => {
      const now = new Date();

      const overdueTasks = await prisma.task.findMany({
        where: {
          tenantId: authCtx.tenantId,
          deletedAt: null,
          dueDate: {
            lt: now,
          },
          status: {
            notIn: ["DONE", "CANCELLED"],
          },
          completed: false,
          ...(assignedToId ? { assignedToId } : {}),
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          status: true,
          contactId: true,
          dealId: true,
          assignedTo: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: {
          dueDate: "asc",
        },
        take: limit ?? 100,
      });

      const result = overdueTasks.map((task) => {
        const daysOverdue = Math.floor(
          (now.getTime() - task.dueDate!.getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          taskId: task.id,
          title: task.title,
          dueDate: task.dueDate?.toISOString() ?? null,
          daysOverdue,
          priority: task.priority,
          status: task.status,
          contactId: task.contactId,
          dealId: task.dealId,
          assignedTo: {
            id: task.assignedTo.id,
            username: task.assignedTo.username,
          },
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 4. crm_staff_inactive
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "crm_staff_inactive",
    {
      title: "Inactive staff",
      description:
        "List users with no activity created in the specified hours window. Includes last activity timestamp.",
      inputSchema: {
        hours: z
          .number()
          .int()
          .min(1)
          .max(720)
          .default(24)
          .describe("Hours lookback window (1-720, default 24)"),
      },
    },
    async ({ hours }) => {
      const now = new Date();
      const hoursAgo = new Date(now);
      hoursAgo.setHours(hoursAgo.getHours() - (hours ?? 24));

      // Get all non-deleted users
      const allUsers = await prisma.user.findMany({
        where: {
          tenantId: authCtx.tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          username: true,
        },
      });

      // Get users who created activities in the window
      const activeUserIds = await prisma.activity
        .findMany({
          where: {
            tenantId: authCtx.tenantId,
            deletedAt: null,
            createdAt: {
              gte: hoursAgo,
            },
          },
          select: {
            createdById: true,
          },
          distinct: ["createdById"],
        })
        .then((acts) => new Set(acts.map((a) => a.createdById)));

      // Find inactive users
      const inactiveUserIds = allUsers
        .filter((u) => !activeUserIds.has(u.id))
        .map((u) => u.id);

      // Get last activity for each inactive user
      const lastActivities = await prisma.activity.groupBy({
        by: ["createdById"],
        where: {
          createdById: { in: inactiveUserIds },
          tenantId: authCtx.tenantId,
          deletedAt: null,
        },
        _max: {
          activityAt: true,
        },
      });

      const lastActivityMap = Object.fromEntries(
        lastActivities.map((la) => [la.createdById, la._max.activityAt]),
      );

      const result = inactiveUserIds.map((userId) => {
        const user = allUsers.find((u) => u.id === userId);
        return {
          userId,
          username: user?.username || "Unknown",
          lastActivityAt: lastActivityMap[userId]?.toISOString() ?? null,
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 5. crm_staff_conversion
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "crm_staff_conversion",
    {
      title: "Staff conversion metrics",
      description:
        "Per-user conversion metrics: activities created, deals won, deals won value, and conversion rate within a date range.",
      inputSchema: {
        from: z.string().describe("ISO date (inclusive, lower bound)"),
        to: z.string().describe("ISO date (exclusive, upper bound)"),
      },
    },
    async ({ from, to }) => {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      // Get activity counts per user
      const activitiesByUser = await prisma.activity.groupBy({
        by: ["createdById"],
        where: {
          tenantId: authCtx.tenantId,
          deletedAt: null,
          createdAt: {
            gte: fromDate,
            lt: toDate,
          },
        },
        _count: true,
      });

      // Get won deals per user (assigned to them, closed in range)
      const dealsWonByUser = await prisma.deal.groupBy({
        by: ["assignedToId"],
        where: {
          tenantId: authCtx.tenantId,
          deletedAt: null,
          isLatest: true,
          status: "WON",
          closedAt: {
            gte: fromDate,
            lt: toDate,
          },
        },
        _count: true,
        _sum: { value: true },
      });

      // Get user info
      const userIds = [
        ...new Set([
          ...activitiesByUser.map((a) => a.createdById),
          ...dealsWonByUser.map((d) => d.assignedToId),
        ]),
      ];

      const users = await prisma.user.findMany({
        where: {
          id: { in: userIds },
          deletedAt: null,
        },
        select: {
          id: true,
          username: true,
        },
      });

      const userMap = Object.fromEntries(users.map((u) => [u.id, u.username]));
      const activityMap = Object.fromEntries(
        activitiesByUser.map((a) => [a.createdById, a._count]),
      );
      const dealsWonMap = Object.fromEntries(
        dealsWonByUser.map((d) => [
          d.assignedToId,
          { count: d._count, value: d._sum?.value ?? 0 },
        ]),
      );

      const result = userIds.map((userId) => {
        const activitiesCount = activityMap[userId] ?? 0;
        const dealsInfo = dealsWonMap[userId];
        const dealsWonCount = dealsInfo?.count ?? 0;
        const dealsWonValue = dealsInfo?.value ?? 0;

        const conversionRate =
          activitiesCount > 0 ? (dealsWonCount / activitiesCount) * 100 : null;

        return {
          userId,
          username: userMap[userId] || "Unknown",
          activitiesCount,
          dealsWonCount,
          dealsWonValue: dealsWonValue.toString(),
          conversionRate:
            conversionRate !== null
              ? Math.round(conversionRate * 100) / 100
              : null,
        };
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 6. list_contacts (originally inlined in mcp.server.ts)
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "list_contacts",
    {
      title: "List contacts",
      description:
        "List CRM contacts for the authenticated tenant. Supports search and pagination.",
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe("Match firstName, lastName, email, or phone"),
        limit: z.number().int().min(1).max(100).default(25),
        cursor: z.string().optional(),
      },
    },
    async ({ search, limit, cursor }) => {
      const take = limit ?? 25;
      const where = search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : undefined;

      const rows = await prisma.contact.findMany({
        where,
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          source: true,
          purchaseCount: true,
        },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      };
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 7. list_deals (originally inlined in mcp.server.ts)
  // ──────────────────────────────────────────────────────────────────────────

  registerTool(
    "list_deals",
    {
      title: "List deals",
      description: "List open deals for the authenticated tenant.",
      inputSchema: {
        stage: z.string().optional().describe("Filter by exact stage label"),
        status: z.enum(["OPEN", "WON", "LOST"]).optional(),
        limit: z.number().int().min(1).max(100).default(25),
      },
    },
    async ({ stage, status, limit }) => {
      const take = limit ?? 25;
      const where: Record<string, unknown> = {};
      if (stage) where.stage = stage;
      if (status) where.status = status;

      const rows = await prisma.deal.findMany({
        where,
        take,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          stage: true,
          status: true,
          value: true,
          probability: true,
          expectedCloseDate: true,
          contact: { select: { firstName: true, lastName: true } },
        },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      };
    },
  );
}
