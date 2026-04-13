/**
 * Mock API bodies for automation E2E (AT-UI-003). Shapes match `ok()` API responses.
 */

export const E2E_STUB_AUTOMATION_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const IF_NODE_ID = "00000000-0000-4000-8000-000000000021";
const NOOP_THEN = "00000000-0000-4000-8000-000000000022";
const NOOP_ELSE = "00000000-0000-4000-8000-000000000023";

export const E2E_STUB_GRAPH_RUN_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

export function stubAutomationDefinitionsListBody(): string {
  return JSON.stringify({
    success: true,
    data: {
      automations: [
        {
          id: E2E_STUB_AUTOMATION_ID,
          name: "E2E stub (mocked list)",
          description: null,
          scopeType: "GLOBAL",
          scopeId: null,
          status: "ACTIVE",
          executionMode: "SHADOW",
          suppressLegacyWorkflows: false,
          version: 1,
          triggers: [
            {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              eventName: "inventory.stock.low_detected",
              conditionGroups: null,
              delayMinutes: 0,
            },
          ],
          steps: [],
          flowGraph: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      pagination: {
        page: 1,
        limit: 25,
        totalItems: 1,
        totalPages: 1,
      },
    },
  });
}

export function stubAutomationRunsBody(): string {
  return JSON.stringify({
    success: true,
    data: {
      runs: [
        {
          id: E2E_STUB_GRAPH_RUN_ID,
          automationEventId: null,
          status: "SUCCEEDED",
          executionMode: "SHADOW",
          eventName: "inventory.stock.low_detected",
          entityType: "PRODUCT",
          entityId: "prod-e2e",
          errorMessage: null,
          stepOutput: {
            __automationGraph: {
              branchDecisions: { [IF_NODE_ID]: "true" },
            },
          },
          flowGraphSnapshot: {
            nodes: [
              {
                id: IF_NODE_ID,
                kind: "if",
                config: {
                  conditions: [{ path: "total", operator: "gte", value: 1000 }],
                },
              },
              { id: NOOP_THEN, kind: "noop" },
              { id: NOOP_ELSE, kind: "noop" },
            ],
            edges: [
              {
                fromNodeId: IF_NODE_ID,
                toNodeId: NOOP_THEN,
                edgeKey: "true",
              },
              {
                fromNodeId: IF_NODE_ID,
                toNodeId: NOOP_ELSE,
                edgeKey: "false",
              },
            ],
          },
          startedAt: "2026-01-02T00:00:00.000Z",
          completedAt: "2026-01-02T00:00:01.000Z",
          runSteps: [],
        },
      ],
    },
  });
}
