import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loosePromptRegister } from "./index";

const argsSchema = {
  since: z
    .string()
    .optional()
    .describe(
      "ISO datetime lower bound for the review window. Defaults to 24h ago.",
    ),
  format: z
    .enum(["pdf", "excel", "both"])
    .optional()
    .describe(
      "Report format. Omit to have the workflow ask the user interactively.",
    ),
};

export function registerCrmStaffActivityReviewPrompt(server: McpServer) {
  const registerPrompt = loosePromptRegister(server);
  registerPrompt(
    "crm_staff_activity_review",
    {
      title: "CRM Staff Activity Review",
      description:
        "Accountability sweep: activity per staff, stalled deals, overdue tasks, inactive staff, and activity-to-conversion ratio. Produces a PDF/Excel report.",
      argsSchema,
    },
    async (args) => {
      const now = new Date();
      const sinceDefault = new Date(
        now.getTime() - 24 * 60 * 60 * 1000,
      ).toISOString();
      const since = args.since ?? sinceDefault;
      const to = now.toISOString();
      const format = args.format;

      const instructions = buildCrmInstructions(since, to, format);

      return {
        description: `CRM Staff Activity Review since ${since}`,
        messages: [
          {
            role: "user" as const,
            content: { type: "text" as const, text: instructions },
          },
        ],
      };
    },
  );
}

function buildCrmInstructions(
  since: string,
  to: string,
  format?: string,
): string {
  const formatLine = format
    ? `The user already chose format="${format}" — skip the question and call report_render with that format at the end.`
    : `The user has NOT chosen a format. After all steps, ASK the user: "How would you like this report — PDF Summary, Excel Full Data, or Both?" Then call report_render with their choice.`;

  return `You are executing the **CRM Staff Activity Review** workflow.

Window: since=${since}, to=${to}.

Run these steps in order. The goal is accountability — is the team actually doing the work, and is the work turning into revenue?

### Step 01 — Actions Logged
- Call \`crm_staff_activity\` with { from: since, to: to }.
- For each staff member, capture total activities, breakdown by type (CALL / EMAIL / MEETING), and today-vs-yesterday count.

### Step 02 — Open Deals by Stage
- Call \`crm_deals_by_stage\` with { stuckThresholdDays: 7, status: "OPEN" }.
- Note total count per stage and the list of \`stalled\` deals (>= 7 days since last update). **Caveat to mention in the report:** stage-stuck detection uses Deal.updatedAt as a proxy — any deal edit (not just stage change) resets it. A proper stage-history model is a follow-up.

### Step 03 — Overdue Follow-ups
- Call \`crm_overdue_tasks\` with { limit: 100 }.
- Sort the result by daysOverdue desc. Surface the top offenders by assignee.

### Step 04 — Staff With No Activity
- Call \`crm_staff_inactive\` with { hours: 24 }.
- Surface each user by username with their lastActivityAt (null = never).

### Step 05 — Cross-Check: Activity vs. Sales
- Call \`crm_staff_conversion\` with { from: since, to: to }.
- Per staff: activitiesCount, dealsWonCount, dealsWonValue, conversionRate.
- Flag anyone with HIGH activitiesCount + LOW conversionRate — that's a process problem, not an effort problem.

### Output
Assemble the payload:
\`\`\`
{
  since: "${since}",
  staffActivity: [{ username, totalActivities, byType, todayCount, yesterdayCount }],
  byStage: [{ stage, count, totalValue }],
  stalled: [{ name, stage, value, daysSinceUpdate, assignedTo }],
  overdueTasks: [{ title, dueDate, daysOverdue, assignedTo, dealId? }],
  inactiveStaff: [{ username, lastActivityAt }],
  conversion: [{ username, activitiesCount, dealsWonCount, dealsWonValue, conversionRate }],
  flags: [ "2-5 concise callouts: who needs a nudge, which deals are stalled, who's an outlier on conversion" ]
}
\`\`\`

${formatLine}

Call \`report_render\` with { workflow: "crm", format: <chosen>, payload: <above> } and return download URLs along with a short text summary of the headline accountability findings.`;
}
