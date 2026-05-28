import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loosePromptRegister } from "./index";

const TODAY_ISO = () => new Date().toISOString().slice(0, 10);

const argsSchema = {
  asOf: z
    .string()
    .optional()
    .describe(
      "Date to analyze, ISO 'YYYY-MM-DD'. Defaults to today. The 'yesterday' step uses asOf-1d.",
    ),
  format: z
    .enum(["pdf", "excel", "both"])
    .optional()
    .describe(
      "Report format. Omit to have the workflow ask the user interactively.",
    ),
};

export function registerDailySalesAnalysisPrompt(server: McpServer) {
  const registerPrompt = loosePromptRegister(server);
  registerPrompt(
    "daily_sales_analysis",
    {
      title: "Daily Sales Analysis",
      description:
        "Strategist sequence: yesterday + 7-day window + week-over-week + 28-day-prior + top SKUs + stock check on top sellers. Produces a PDF/Excel report via report_render.",
      argsSchema,
    },
    async (args) => {
      const asOf = args.asOf ?? TODAY_ISO();
      const format = args.format;

      const instructions = buildSalesInstructions(asOf, format);

      return {
        description: `Daily Sales Analysis for ${asOf}`,
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

function buildSalesInstructions(asOf: string, format?: string): string {
  const formatLine = format
    ? `The user already chose format="${format}" — skip the question and call report_render with that format at the end.`
    : `The user has NOT chosen a format. After completing all steps and assembling the payload, ASK the user: "How would you like this report — PDF Summary, Excel Full Data, or Both?" Then call report_render with their choice.`;

  return `You are executing the **Daily Sales Analysis** workflow for asOf=${asOf}.

Run the steps below in order. Each step names the exact MCP tool to call and what to extract. Date math is calendar-day; treat dates as UTC ISO strings 'YYYY-MM-DD'.

Let D = ${asOf} (the analysis day).

### Step 01 — Yesterday's Sales
- Call \`sales_summary\` with { from: D-1d, to: D }.
- Call \`sales_summary\` with { from: D-30d, to: D } and divide by 30 to get the 30-day daily average.
- Compare: is yesterday above or below the 30-day daily average? Record absolute and % delta.

### Step 02 — Last 7 Days Breakdown
- Call \`sales_daily_breakdown\` with { from: D-7d, to: D }.
- Identify the strongest and weakest day. Note any pattern (weekday-weekend, upward/downward slope).

### Step 03 — vs. Last Week (same 7 days)
- Call \`sales_compare_period\` with rangeA={from: D-7d, to: D} and rangeB={from: D-14d, to: D-7d}.
- Record direction and magnitude of revenue/units/transactions change. Has the *shape* of the week changed (e.g., peak day shifted)?

### Step 04 — vs. Last Month (28-day offset)
- Call \`sales_compare_period\` with rangeA={from: D-7d, to: D} and rangeB={from: D-35d, to: D-28d}.
- Is the change seasonal or a real shift? (Caveat: this is exact 28-day offset, not calendar-month-position.)

### Step 05 — Product Breakdown
- Call \`sales_by_product\` with { from: D-7d, to: D, topN: 5, sortBy: "revenue" }.
- Call \`sales_by_product\` with { from: D-7d, to: D, topN: 5, sortBy: "units" }.
- Collect the union of \`variationId\`s from both lists.
- Optional: spot products that appear here but not in the same query over the prior week (D-14d → D-7d) — those are spiking. Drops are the reverse.

### Step 06 — Stock Check on Top Sellers
- Call \`inventory_days_to_stockout\` with { variationIds: <union from Step 05>, windowDays: 7 }.
- Flag every SKU with severity ∈ {critical, urgent} — those are the push-or-restock candidates.

### Output
Assemble the report payload matching this shape:
\`\`\`
{
  asOf: "${asOf}",
  summary: { revenue, units, transactions, dailyAvg30d },
  last7Days: [{ date, revenue, units, transactions }],
  vsLastWeek: { revenue: {abs,pct}, units: {abs,pct}, transactions: {abs,pct} },
  vsLastMonth: { revenue: {abs,pct}, units: {abs,pct}, transactions: {abs,pct} },
  topProducts: { byRevenue: [...], byUnits: [...] },
  stockOnTopSellers: [{ productName, qty, reorderLevel, daysRemaining, severity }],
  recommendations: [ "2-4 specific push/restock items with one-sentence reasoning each" ]
}
\`\`\`

${formatLine}

Call \`report_render\` with { workflow: "sales", format: <chosen>, payload: <above> } and return the resulting download URLs to the user along with a short text summary of the headline findings (yesterday vs 30d avg, week-over-week, top push recommendation).`;
}
