import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loosePromptRegister } from "./index";

const argsSchema = {
  locationId: z
    .string()
    .optional()
    .describe("Scope the analysis to a single showroom location."),
  format: z
    .enum(["pdf", "excel", "both"])
    .optional()
    .describe(
      "Report format. Omit to have the workflow ask the user interactively.",
    ),
};

export function registerInventoryDecisionPrompt(server: McpServer) {
  const registerPrompt = loosePromptRegister(server);
  registerPrompt(
    "inventory_decision",
    {
      title: "Inventory Decision",
      description:
        "Cross-references stock against sales velocity to produce a three-section action list: Reorder Now / Push or Promote / Review and Decide. Outputs PDF/Excel via report_render.",
      argsSchema,
    },
    async (args) => {
      const locationId = args.locationId;
      const format = args.format;
      const asOf = new Date().toISOString().slice(0, 10);

      const instructions = buildInventoryInstructions(asOf, locationId, format);

      return {
        description: `Inventory Decision for ${asOf}${locationId ? ` (location ${locationId})` : ""}`,
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

function buildInventoryInstructions(
  asOf: string,
  locationId: string | undefined,
  format?: string,
): string {
  const locArg = locationId ? `, locationId: "${locationId}"` : "";
  const locClause = locationId
    ? ` for location ${locationId}`
    : " across all locations";
  const formatLine = format
    ? `The user already chose format="${format}" — skip the question and call report_render with that format at the end.`
    : `The user has NOT chosen a format. After all steps and assembling the payload, ASK the user: "How would you like this report — PDF Summary, Excel Full Data, or Both?" Then call report_render with their choice.`;

  return `You are executing the **Inventory Decision** workflow${locClause}. As of ${asOf}.

The goal: a clear action list grouped into three buckets — Reorder Now, Push or Promote, Review and Decide.

### Step 01 — Full Stock Snapshot
- Call \`inventory_snapshot\` with { filter: "all"${locArg}, limit: 500 }.
- Note total SKUs, count below reorder (\`qty < reorderLevel\`), and count overstocked (\`qty > reorderLevel * 3\`).

### Step 02 — Sales Velocity (last 7 days)
- Call \`sales_velocity\` with { windowDays: 7 }.
- Build a map: variationId → avgPerDay.

### Step 03 — Days to Stockout
- Call \`inventory_days_to_stockout\` with { windowDays: 7${locArg}, limit: 500 }.
- For each SKU: severity classification (critical < 3 days, urgent 3–7 days, ok ≥ 7 days, no_movement if velocity = 0).

### Step 04 — Dead Stock
- Call \`inventory_snapshot\` with { filter: "dead"${locArg}, limit: 500 }.
- These are SKUs sitting on the shelf with zero / near-zero sales in the last 14 days.

### Synthesis — Build the Three Buckets

**Reorder Now** = SKUs from Step 03 with severity ∈ {critical, urgent} AND \`qty < reorderLevel * 1.5\`.
For each: one-sentence reasoning (e.g., "3 days remaining at current velocity; below reorder").

**Push or Promote** = SKUs from Step 01 that are overstocked AND have positive velocity from Step 02 (i.e., they sell but we have too much). These are candidates for a sale/promo.
For each: one-sentence reasoning ("Stock = 5× reorder level; selling 2/day — promote to clear in 30 days").

**Review and Decide** = Dead stock from Step 04 (held for >= 14 days with no sales).
For each: include lastSaleDate and one-sentence reasoning.

### Output
Assemble the payload:
\`\`\`
{
  asOf: "${asOf}",
  snapshot: { totalSkus, belowReorder, overstocked },
  reorderNow: [{ productName, imsCode, qty, reorderLevel, daysRemaining, severity, reasoning }],
  pushOrPromote: [{ productName, qty, daysRemaining, reasoning }],
  reviewAndDecide: [{ productName, qty, lastSaleDate, reasoning }]
}
\`\`\`

${formatLine}

Call \`report_render\` with { workflow: "inventory", format: <chosen>, payload: <above> } and return download URLs plus a short text summary (counts in each bucket and the top urgent reorder).`;
}
