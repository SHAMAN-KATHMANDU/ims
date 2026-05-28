/**
 * Report types and Zod schemas for each workflow.
 * Loose validation with passthrough() to allow LLM flexibility.
 */

import { z } from "zod";

// ============================================
// Sales Report Payload
// ============================================
export const SalesReportPayloadSchema = z
  .object({
    asOf: z.string().describe("ISO timestamp for report generation date"),
    summary: z
      .object({
        revenue: z
          .string()
          .describe("Total revenue (formatted currency string)"),
        units: z.number().describe("Total units sold"),
        transactions: z.number().describe("Total transaction count"),
        dailyAvg30d: z.string().describe("Average daily revenue over 30 days"),
      })
      .optional(),
    last7Days: z
      .array(
        z.object({
          date: z.string(),
          revenue: z.string(),
          units: z.number(),
          transactions: z.number(),
        }),
      )
      .optional(),
    vsLastWeek: z
      .object({
        revenue: z.object({
          abs: z.string(),
          pct: z.string(),
        }),
        units: z.object({
          abs: z.string(),
          pct: z.string(),
        }),
        transactions: z.object({
          abs: z.string(),
          pct: z.string(),
        }),
      })
      .optional(),
    vsLastMonth: z
      .object({
        revenue: z.object({
          abs: z.string(),
          pct: z.string(),
        }),
        units: z.object({
          abs: z.string(),
          pct: z.string(),
        }),
        transactions: z.object({
          abs: z.string(),
          pct: z.string(),
        }),
      })
      .optional(),
    topProducts: z
      .object({
        byRevenue: z
          .array(
            z.object({
              productName: z.string(),
              imsCode: z.string(),
              units: z.number(),
              revenue: z.string(),
              pct: z.string(),
            }),
          )
          .optional(),
        byUnits: z
          .array(
            z.object({
              productName: z.string(),
              imsCode: z.string(),
              units: z.number(),
              revenue: z.string(),
              pct: z.string(),
            }),
          )
          .optional(),
      })
      .optional(),
    stockOnTopSellers: z
      .array(
        z.object({
          productName: z.string(),
          qty: z.number(),
          reorderLevel: z.number(),
          daysRemaining: z.number().optional(),
          severity: z.enum(["critical", "warning", "info"]).optional(),
        }),
      )
      .optional(),
    recommendations: z
      .array(z.string())
      .describe("AI-generated recommendations")
      .optional(),
  })
  .passthrough();

export type SalesReportPayload = z.infer<typeof SalesReportPayloadSchema>;

// ============================================
// CRM Report Payload
// ============================================
export const CrmReportPayloadSchema = z
  .object({
    since: z.string().describe("ISO timestamp for report start date"),
    staffActivity: z
      .array(
        z.object({
          username: z.string(),
          totalActivities: z.number(),
          byType: z.record(z.number()).optional(),
          todayCount: z.number().optional(),
          yesterdayCount: z.number().optional(),
        }),
      )
      .optional(),
    byStage: z
      .array(
        z.object({
          stage: z.string(),
          count: z.number(),
          totalValue: z.string(),
        }),
      )
      .optional(),
    stalled: z
      .array(
        z.object({
          name: z.string(),
          stage: z.string(),
          value: z.string(),
          daysSinceUpdate: z.number(),
          assignedTo: z.string().optional(),
        }),
      )
      .optional(),
    overdueTasks: z
      .array(
        z.object({
          title: z.string(),
          dueDate: z.string(),
          daysOverdue: z.number(),
          assignedTo: z.string(),
          dealId: z.string().optional(),
        }),
      )
      .optional(),
    inactiveStaff: z
      .array(
        z.object({
          username: z.string(),
          lastActivityAt: z.string(),
        }),
      )
      .optional(),
    conversion: z
      .array(
        z.object({
          username: z.string(),
          activitiesCount: z.number(),
          dealsWonCount: z.number(),
          dealsWonValue: z.string(),
          conversionRate: z.string(),
        }),
      )
      .optional(),
    flags: z.array(z.string()).describe("AI-generated callouts").optional(),
  })
  .passthrough();

export type CrmReportPayload = z.infer<typeof CrmReportPayloadSchema>;

// ============================================
// Inventory Report Payload
// ============================================
export const InventoryReportPayloadSchema = z
  .object({
    asOf: z.string().describe("ISO timestamp for report generation date"),
    snapshot: z
      .object({
        totalSkus: z.number(),
        belowReorder: z.number(),
        overstocked: z.number(),
      })
      .optional(),
    reorderNow: z
      .array(
        z.object({
          productName: z.string(),
          imsCode: z.string(),
          qty: z.number(),
          reorderLevel: z.number(),
          daysRemaining: z.number().optional(),
          severity: z.enum(["critical", "warning", "info"]).optional(),
          reasoning: z.string().optional(),
        }),
      )
      .optional(),
    pushOrPromote: z
      .array(
        z.object({
          productName: z.string(),
          qty: z.number(),
          daysRemaining: z.number().optional(),
          reasoning: z.string().optional(),
        }),
      )
      .optional(),
    reviewAndDecide: z
      .array(
        z.object({
          productName: z.string(),
          qty: z.number(),
          lastSaleDate: z.string().optional(),
          reasoning: z.string().optional(),
        }),
      )
      .optional(),
  })
  .passthrough();

export type InventoryReportPayload = z.infer<
  typeof InventoryReportPayloadSchema
>;

// ============================================
// Report types
// ============================================
export type ReportWorkflow = "sales" | "crm" | "inventory";
export type ReportFormat = "pdf" | "excel" | "both";

export interface ReportPayloadMap {
  sales: SalesReportPayload;
  crm: CrmReportPayload;
  inventory: InventoryReportPayload;
}

export interface SignedReportUrl {
  reportId: string;
  downloadUrls: {
    pdf?: string;
    excel?: string;
  };
  expiresAt: string;
}
