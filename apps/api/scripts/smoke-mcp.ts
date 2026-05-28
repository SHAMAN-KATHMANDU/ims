/**
 * Smoke test for the MCP server: instantiate it with a fake auth context,
 * list registered tools and prompts, and invoke each prompt to verify the
 * instruction text renders without errors.
 *
 * Run with: pnpm -F api exec tsx scripts/smoke-mcp.ts
 *           (or ts-node, whichever the project uses)
 */

import { createMcpServer } from "../src/modules/mcp/mcp.server";

async function main() {
  const server = createMcpServer({
    tenantId: "00000000-0000-0000-0000-000000000000",
    tenantSlug: "smoke",
    userId: "00000000-0000-0000-0000-000000000001",
    userRole: "admin",
  });

  // The McpServer keeps registrations on the underlying Server's request handlers
  // and on its own `_registeredTools` / `_registeredPrompts` private fields.
  // We can read them via the public list endpoints by inspecting `server.server`.
  const inner = (server as any)._registeredTools as Record<string, unknown>;
  const promptsMap = (server as any)._registeredPrompts as Record<string, any>;

  const toolNames = Object.keys(inner ?? {}).sort();
  const promptNames = Object.keys(promptsMap ?? {}).sort();

  console.log("Tools registered:", toolNames.length);
  for (const n of toolNames) console.log("  -", n);
  console.log();
  console.log("Prompts registered:", promptNames.length);
  for (const n of promptNames) console.log("  -", n);
  console.log();

  // Invoke each prompt callback (no args) and confirm it produces messages.
  for (const name of promptNames) {
    const promptDef = promptsMap[name];
    const cb = promptDef.callback as (args: any, extra: any) => any;
    try {
      const result = await cb({}, {} as any);
      const text = result?.messages?.[0]?.content?.text ?? "";
      const ok = typeof text === "string" && text.length > 100;
      console.log(
        `Prompt ${name}: ${ok ? "OK" : "EMPTY"} (${text.length} chars)`,
      );
    } catch (e: any) {
      console.error(`Prompt ${name}: FAILED — ${e?.message ?? e}`);
    }
  }

  const expectedTools = [
    "list_products",
    "list_contacts",
    "sales_summary",
    "list_deals",
    "inventory_levels",
    "create_sale",
    "sales_daily_breakdown",
    "sales_compare_period",
    "sales_by_product",
    "sales_velocity",
    "sales_last_sold",
    "inventory_snapshot",
    "inventory_days_to_stockout",
    "crm_staff_activity",
    "crm_deals_by_stage",
    "crm_overdue_tasks",
    "crm_staff_inactive",
    "crm_staff_conversion",
    "report_render",
  ];
  const expectedPrompts = [
    "daily_sales_analysis",
    "crm_staff_activity_review",
    "inventory_decision",
  ];

  const missingTools = expectedTools.filter((t) => !toolNames.includes(t));
  const missingPrompts = expectedPrompts.filter(
    (p) => !promptNames.includes(p),
  );

  if (missingTools.length || missingPrompts.length) {
    console.error("\nMISSING REGISTRATIONS:");
    if (missingTools.length) console.error("  Tools:", missingTools);
    if (missingPrompts.length) console.error("  Prompts:", missingPrompts);
    process.exit(1);
  }

  console.log("\nAll expected registrations present.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
