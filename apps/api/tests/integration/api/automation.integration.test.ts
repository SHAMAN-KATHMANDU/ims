/**
 * Automation API integration tests against the real Express app.
 * Full create-with-flowGraph requires DATABASE_URL and a writable DB.
 */

import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import app from "@/config/express.config";
import { env } from "@/config/env";
import { basePrisma } from "@/config/prisma";
import { apiRequest, withAuth } from "@tests/helpers/api";
import { hashPassword } from "../../../prisma/seeds/utils";
import {
  compileLinearStepsToFlowGraph,
  parseAndValidateAutomationFlowGraph,
} from "@repo/shared";

const databaseUrlConfigured = Boolean(process.env.DATABASE_URL?.trim());

function signAdminToken(input: {
  userId: string;
  tenantId: string;
  tenantSlug: string;
}): string {
  return jwt.sign(
    {
      id: input.userId,
      role: "admin",
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      username: "automation-it-user",
    },
    env.jwtSecret,
    { expiresIn: "1h" },
  );
}

describe("Automation API integration", () => {
  it("returns 401 when POST /automation/definitions has no Bearer token", async () => {
    const res = await apiRequest(app)
      .post("/api/v1/automation/definitions")
      .set("Content-Type", "application/json")
      .send({
        name: "No-auth probe",
        scopeType: "GLOBAL",
        triggers: [{ eventName: "crm.contact.created" }],
        steps: [
          {
            actionType: "notification.send",
            actionConfig: { title: "Hi", message: "Test" },
          },
        ],
      });

    expect(res.status).toBe(401);
  });

  it.skipIf(!databaseUrlConfigured)(
    "creates a definition with flowGraph when JWT and tenant exist",
    async () => {
      const tenantId = randomUUID();
      const userId = randomUUID();
      const slug = `auto-it-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

      const passwordHash = await hashPassword("automation-it-pass");

      await basePrisma.tenant.create({
        data: {
          id: tenantId,
          name: "Automation IT Tenant",
          slug,
          plan: "STARTER",
          isActive: true,
          isTrial: false,
          subscriptionStatus: "ACTIVE",
        },
      });

      await basePrisma.user.create({
        data: {
          id: userId,
          tenantId,
          username: `admin-${slug}`,
          password: passwordHash,
          role: "admin",
        },
      });

      const token = signAdminToken({ userId, tenantId, tenantSlug: slug });

      const flowGraph = compileLinearStepsToFlowGraph(
        [
          {
            actionType: "notification.send",
            actionConfig: { title: "IT", message: "Graph create" },
          },
        ],
        undefined,
      );

      try {
        const res = await apiRequest(app)
          .post("/api/v1/automation/definitions")
          .set(withAuth(token))
          .set("Content-Type", "application/json")
          .send({
            name: `Graph automation ${slug.slice(0, 6)}`,
            description: "integration test",
            scopeType: "GLOBAL",
            triggers: [{ eventName: "crm.contact.created" }],
            steps: [],
            flowGraph,
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.automation).toMatchObject({
          name: expect.stringMatching(/Graph automation/),
        });
        expect(res.body.data.automation.flowGraph).toBeTruthy();
        expect(res.body.data.automation.steps?.length ?? 0).toBe(0);

        const defId = res.body.data.automation.id as string;
        const graphBefore = res.body.data.automation.flowGraph as {
          nodes?: unknown[];
        };
        const nodeCountBefore = graphBefore.nodes?.length ?? 0;

        const patchRes = await apiRequest(app)
          .put(`/api/v1/automation/definitions/${defId}`)
          .set(withAuth(token))
          .set("Content-Type", "application/json")
          .send({ name: "Renamed graph automation" });

        expect(patchRes.status).toBe(200);
        expect(patchRes.body.success).toBe(true);
        expect(patchRes.body.data.automation.name).toBe(
          "Renamed graph automation",
        );
        expect(patchRes.body.data.automation.flowGraph).toBeTruthy();
        const graphAfter = patchRes.body.data.automation.flowGraph as {
          nodes?: unknown[];
        };
        expect(graphAfter.nodes?.length ?? 0).toBe(nodeCountBefore);
        expect(patchRes.body.data.automation.steps?.length ?? 0).toBe(0);
      } finally {
        await basePrisma.tenant.delete({ where: { id: tenantId } });
      }
    },
  );

  it.skipIf(!databaseUrlConfigured)(
    "creates definitions with if and switch flowGraphs",
    async () => {
      const tenantId = randomUUID();
      const userId = randomUUID();
      const slug = `auto-br-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

      const passwordHash = await hashPassword("automation-it-pass");

      await basePrisma.tenant.create({
        data: {
          id: tenantId,
          name: "Automation Branching IT Tenant",
          slug,
          plan: "STARTER",
          isActive: true,
          isTrial: false,
          subscriptionStatus: "ACTIVE",
        },
      });

      await basePrisma.user.create({
        data: {
          id: userId,
          tenantId,
          username: `admin-${slug}`,
          password: passwordHash,
          role: "admin",
        },
      });

      const token = signAdminToken({ userId, tenantId, tenantSlug: slug });
      const triggerEvent = "crm.contact.created" as const;

      const entryIf = randomUUID();
      const ifNodeId = randomUUID();
      const actionIfTrue = randomUUID();
      const actionIfFalse = randomUUID();
      const endIf = randomUUID();

      const ifFlowGraph = {
        nodes: [
          { id: entryIf, kind: "entry" as const },
          {
            id: ifNodeId,
            kind: "if" as const,
            config: {
              conditions: [
                { path: "priority", operator: "eq" as const, value: "high" },
              ],
            },
          },
          {
            id: actionIfTrue,
            kind: "action" as const,
            config: {
              actionType: "notification.send" as const,
              actionConfig: {
                type: "INFO" as const,
                title: "High",
                message: "If true",
              },
            },
          },
          {
            id: actionIfFalse,
            kind: "action" as const,
            config: {
              actionType: "notification.send" as const,
              actionConfig: {
                type: "INFO" as const,
                title: "Other",
                message: "If false",
              },
            },
          },
          { id: endIf, kind: "noop" as const },
        ],
        edges: [
          { fromNodeId: entryIf, toNodeId: ifNodeId },
          { fromNodeId: ifNodeId, toNodeId: actionIfTrue, edgeKey: "true" },
          { fromNodeId: ifNodeId, toNodeId: actionIfFalse, edgeKey: "false" },
          { fromNodeId: actionIfTrue, toNodeId: endIf },
          { fromNodeId: actionIfFalse, toNodeId: endIf },
        ],
      };

      const ifValidation = parseAndValidateAutomationFlowGraph(ifFlowGraph, [
        triggerEvent,
      ]);
      expect(ifValidation.ok).toBe(true);

      const entrySw = randomUUID();
      const switchId = randomUUID();
      const aEast = randomUUID();
      const aWest = randomUUID();
      const aDefault = randomUUID();

      const switchFlowGraph = {
        nodes: [
          { id: entrySw, kind: "entry" as const },
          {
            id: switchId,
            kind: "switch" as const,
            config: { discriminantPath: "segment" },
          },
          {
            id: aEast,
            kind: "action" as const,
            config: {
              actionType: "notification.send" as const,
              actionConfig: {
                type: "INFO" as const,
                title: "East",
                message: "Switch east",
              },
            },
          },
          {
            id: aWest,
            kind: "action" as const,
            config: {
              actionType: "notification.send" as const,
              actionConfig: {
                type: "INFO" as const,
                title: "West",
                message: "Switch west",
              },
            },
          },
          {
            id: aDefault,
            kind: "action" as const,
            config: {
              actionType: "notification.send" as const,
              actionConfig: {
                type: "INFO" as const,
                title: "Default",
                message: "Switch default",
              },
            },
          },
        ],
        edges: [
          { fromNodeId: entrySw, toNodeId: switchId },
          { fromNodeId: switchId, toNodeId: aEast, edgeKey: "east" },
          { fromNodeId: switchId, toNodeId: aWest, edgeKey: "west" },
          { fromNodeId: switchId, toNodeId: aDefault, edgeKey: "default" },
        ],
      };

      const swValidation = parseAndValidateAutomationFlowGraph(
        switchFlowGraph,
        [triggerEvent],
      );
      expect(swValidation.ok).toBe(true);

      try {
        const resIf = await apiRequest(app)
          .post("/api/v1/automation/definitions")
          .set(withAuth(token))
          .set("Content-Type", "application/json")
          .send({
            name: `If graph ${slug.slice(0, 6)}`,
            description: "branching if integration",
            scopeType: "GLOBAL",
            triggers: [{ eventName: triggerEvent }],
            steps: [],
            flowGraph: ifFlowGraph,
          });

        expect(resIf.status).toBe(201);
        expect(resIf.body.success).toBe(true);
        expect(resIf.body.data.automation.flowGraph).toBeTruthy();
        const ifNodes = (
          resIf.body.data.automation.flowGraph as { nodes: unknown[] }
        ).nodes;
        expect(ifNodes.some((n: { kind?: string }) => n.kind === "if")).toBe(
          true,
        );

        const resSw = await apiRequest(app)
          .post("/api/v1/automation/definitions")
          .set(withAuth(token))
          .set("Content-Type", "application/json")
          .send({
            name: `Switch graph ${slug.slice(0, 6)}`,
            description: "branching switch integration",
            scopeType: "GLOBAL",
            triggers: [{ eventName: triggerEvent }],
            steps: [],
            flowGraph: switchFlowGraph,
          });

        expect(resSw.status).toBe(201);
        expect(resSw.body.success).toBe(true);
        expect(resSw.body.data.automation.flowGraph).toBeTruthy();
        const swNodes = (
          resSw.body.data.automation.flowGraph as { nodes: unknown[] }
        ).nodes;
        expect(
          swNodes.some((n: { kind?: string }) => n.kind === "switch"),
        ).toBe(true);
      } finally {
        await basePrisma.tenant.delete({ where: { id: tenantId } });
      }
    },
  );

  it.skipIf(!databaseUrlConfigured)(
    "returns 400 when flowGraph switch omits required default edge",
    async () => {
      const tenantId = randomUUID();
      const userId = randomUUID();
      const slug = `auto-inv-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

      const passwordHash = await hashPassword("automation-it-pass");

      await basePrisma.tenant.create({
        data: {
          id: tenantId,
          name: "Automation Invalid Graph IT",
          slug,
          plan: "STARTER",
          isActive: true,
          isTrial: false,
          subscriptionStatus: "ACTIVE",
        },
      });

      await basePrisma.user.create({
        data: {
          id: userId,
          tenantId,
          username: `admin-${slug}`,
          password: passwordHash,
          role: "admin",
        },
      });

      const token = signAdminToken({ userId, tenantId, tenantSlug: slug });
      const triggerEvent = "crm.contact.created" as const;

      const entrySw = randomUUID();
      const switchId = randomUUID();
      const aEast = randomUUID();
      const aWest = randomUUID();

      const switchNoDefault = {
        nodes: [
          { id: entrySw, kind: "entry" as const },
          {
            id: switchId,
            kind: "switch" as const,
            config: { discriminantPath: "segment" },
          },
          {
            id: aEast,
            kind: "action" as const,
            config: {
              actionType: "notification.send" as const,
              actionConfig: {
                type: "INFO" as const,
                title: "East",
                message: "x",
              },
            },
          },
          {
            id: aWest,
            kind: "action" as const,
            config: {
              actionType: "notification.send" as const,
              actionConfig: {
                type: "INFO" as const,
                title: "West",
                message: "x",
              },
            },
          },
        ],
        edges: [
          { fromNodeId: entrySw, toNodeId: switchId },
          { fromNodeId: switchId, toNodeId: aEast, edgeKey: "east" },
          { fromNodeId: switchId, toNodeId: aWest, edgeKey: "west" },
        ],
      };

      const invalid = parseAndValidateAutomationFlowGraph(switchNoDefault, [
        triggerEvent,
      ]);
      expect(invalid.ok).toBe(false);

      try {
        const res = await apiRequest(app)
          .post("/api/v1/automation/definitions")
          .set(withAuth(token))
          .set("Content-Type", "application/json")
          .send({
            name: `Invalid switch ${slug.slice(0, 6)}`,
            scopeType: "GLOBAL",
            triggers: [{ eventName: triggerEvent }],
            steps: [],
            flowGraph: switchNoDefault,
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(String(res.body.message)).toMatch(/default/i);
      } finally {
        await basePrisma.tenant.delete({ where: { id: tenantId } });
      }
    },
  );

  it.skipIf(!databaseUrlConfigured)(
    "returns 400 when both flowGraph and steps are provided (BR-19)",
    async () => {
      const tenantId = randomUUID();
      const userId = randomUUID();
      const slug = `auto-dual-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

      const passwordHash = await hashPassword("automation-it-pass");

      await basePrisma.tenant.create({
        data: {
          id: tenantId,
          name: "Automation Dual Authority IT",
          slug,
          plan: "STARTER",
          isActive: true,
          isTrial: false,
          subscriptionStatus: "ACTIVE",
        },
      });

      await basePrisma.user.create({
        data: {
          id: userId,
          tenantId,
          username: `admin-${slug}`,
          password: passwordHash,
          role: "admin",
        },
      });

      const token = signAdminToken({ userId, tenantId, tenantSlug: slug });
      const triggerEvent = "crm.contact.created" as const;

      const flowGraph = compileLinearStepsToFlowGraph(
        [
          {
            actionType: "notification.send",
            actionConfig: {
              type: "INFO" as const,
              title: "G",
              message: "Graph",
            },
          },
        ],
        undefined,
      );

      try {
        const res = await apiRequest(app)
          .post("/api/v1/automation/definitions")
          .set(withAuth(token))
          .set("Content-Type", "application/json")
          .send({
            name: `Dual ${slug.slice(0, 6)}`,
            scopeType: "GLOBAL",
            triggers: [{ eventName: triggerEvent }],
            steps: [
              {
                actionType: "notification.send",
                actionConfig: {
                  type: "INFO",
                  title: "S",
                  message: "Step",
                },
              },
            ],
            flowGraph,
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(String(res.body.message)).toMatch(
          /flowGraph is set.*steps must be empty/i,
        );
      } finally {
        await basePrisma.tenant.delete({ where: { id: tenantId } });
      }
    },
  );

  it.skipIf(!databaseUrlConfigured)(
    "returns 400 on PUT when both flowGraph and non-empty steps are sent (BR-19)",
    async () => {
      const tenantId = randomUUID();
      const userId = randomUUID();
      const slug = `auto-put-dual-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

      const passwordHash = await hashPassword("automation-it-pass");

      await basePrisma.tenant.create({
        data: {
          id: tenantId,
          name: "Automation PUT Dual IT",
          slug,
          plan: "STARTER",
          isActive: true,
          isTrial: false,
          subscriptionStatus: "ACTIVE",
        },
      });

      await basePrisma.user.create({
        data: {
          id: userId,
          tenantId,
          username: `admin-${slug}`,
          password: passwordHash,
          role: "admin",
        },
      });

      const token = signAdminToken({ userId, tenantId, tenantSlug: slug });
      const triggerEvent = "crm.contact.created" as const;

      const flowGraph = compileLinearStepsToFlowGraph(
        [
          {
            actionType: "notification.send",
            actionConfig: {
              type: "INFO" as const,
              title: "G",
              message: "Graph",
            },
          },
        ],
        undefined,
      );

      try {
        const createRes = await apiRequest(app)
          .post("/api/v1/automation/definitions")
          .set(withAuth(token))
          .set("Content-Type", "application/json")
          .send({
            name: `Put dual ${slug.slice(0, 6)}`,
            scopeType: "GLOBAL",
            triggers: [{ eventName: triggerEvent }],
            steps: [],
            flowGraph,
          });

        expect(createRes.status).toBe(201);
        const defId = createRes.body.data.automation.id as string;

        const putRes = await apiRequest(app)
          .put(`/api/v1/automation/definitions/${defId}`)
          .set(withAuth(token))
          .set("Content-Type", "application/json")
          .send({
            flowGraph,
            steps: [
              {
                actionType: "notification.send",
                actionConfig: {
                  type: "INFO",
                  title: "S",
                  message: "Step",
                },
              },
            ],
          });

        expect(putRes.status).toBe(400);
        expect(putRes.body.success).toBe(false);
        expect(String(putRes.body.message)).toMatch(
          /When flowGraph is set, steps must be empty/i,
        );
      } finally {
        await basePrisma.tenant.delete({ where: { id: tenantId } });
      }
    },
  );

  it.skipIf(!databaseUrlConfigured)(
    "returns 400 on PUT when only steps are sent but definition already has flowGraph",
    async () => {
      const tenantId = randomUUID();
      const userId = randomUUID();
      const slug = `auto-put-merge-${randomUUID().replace(/-/g, "").slice(0, 12)}`;

      const passwordHash = await hashPassword("automation-it-pass");

      await basePrisma.tenant.create({
        data: {
          id: tenantId,
          name: "Automation PUT Merge IT",
          slug,
          plan: "STARTER",
          isActive: true,
          isTrial: false,
          subscriptionStatus: "ACTIVE",
        },
      });

      await basePrisma.user.create({
        data: {
          id: userId,
          tenantId,
          username: `admin-${slug}`,
          password: passwordHash,
          role: "admin",
        },
      });

      const token = signAdminToken({ userId, tenantId, tenantSlug: slug });
      const triggerEvent = "crm.contact.created" as const;

      const flowGraph = compileLinearStepsToFlowGraph(
        [
          {
            actionType: "notification.send",
            actionConfig: {
              type: "INFO" as const,
              title: "G",
              message: "Graph",
            },
          },
        ],
        undefined,
      );

      try {
        const createRes = await apiRequest(app)
          .post("/api/v1/automation/definitions")
          .set(withAuth(token))
          .set("Content-Type", "application/json")
          .send({
            name: `Put merge ${slug.slice(0, 6)}`,
            scopeType: "GLOBAL",
            triggers: [{ eventName: triggerEvent }],
            steps: [],
            flowGraph,
          });

        expect(createRes.status).toBe(201);
        const defId = createRes.body.data.automation.id as string;

        const putRes = await apiRequest(app)
          .put(`/api/v1/automation/definitions/${defId}`)
          .set(withAuth(token))
          .set("Content-Type", "application/json")
          .send({
            steps: [
              {
                actionType: "notification.send",
                actionConfig: {
                  type: "INFO",
                  title: "S",
                  message: "Step",
                },
              },
            ],
          });

        expect(putRes.status).toBe(400);
        expect(putRes.body.success).toBe(false);
        expect(String(putRes.body.message)).toMatch(
          /Graph automations cannot include linear steps/i,
        );
      } finally {
        await basePrisma.tenant.delete({ where: { id: tenantId } });
      }
    },
  );

  /** AT-MIG-001 — compiled linear chain: 1 entry + N actions, N edges (terminal action, no trailing noop). */
  it.skipIf(!databaseUrlConfigured)(
    "AT-MIG-001: persists compileLinearStepsToFlowGraph(N steps) as graph-only definition",
    async () => {
      const tenantId = randomUUID();
      const userId = randomUUID();
      const slug = `auto-mig1-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const passwordHash = await hashPassword("automation-it-pass");
      const triggerEvent = "crm.contact.created" as const;

      await basePrisma.tenant.create({
        data: {
          id: tenantId,
          name: "AT-MIG-001 Tenant",
          slug,
          plan: "STARTER",
          isActive: true,
          isTrial: false,
          subscriptionStatus: "ACTIVE",
        },
      });

      await basePrisma.user.create({
        data: {
          id: userId,
          tenantId,
          username: `admin-${slug}`,
          password: passwordHash,
          role: "admin",
        },
      });

      const token = signAdminToken({ userId, tenantId, tenantSlug: slug });

      const steps = [
        {
          actionType: "notification.send" as const,
          actionConfig: {
            type: "INFO" as const,
            title: "A1",
            message: "one",
          },
        },
        {
          actionType: "notification.send" as const,
          actionConfig: {
            type: "INFO" as const,
            title: "A2",
            message: "two",
          },
        },
        {
          actionType: "notification.send" as const,
          actionConfig: {
            type: "INFO" as const,
            title: "A3",
            message: "three",
          },
        },
      ];

      const flowGraph = compileLinearStepsToFlowGraph(steps, undefined);
      const validated = parseAndValidateAutomationFlowGraph(flowGraph, [
        triggerEvent,
      ]);
      expect(validated.ok).toBe(true);

      const nodes = flowGraph.nodes;
      const entryNodes = nodes.filter((n) => n.kind === "entry");
      const actionNodes = nodes.filter((n) => n.kind === "action");
      expect(entryNodes).toHaveLength(1);
      expect(actionNodes).toHaveLength(3);
      expect(flowGraph.edges).toHaveLength(3);

      try {
        const res = await apiRequest(app)
          .post("/api/v1/automation/definitions")
          .set(withAuth(token))
          .set("Content-Type", "application/json")
          .send({
            name: `MIG001 ${slug.slice(0, 6)}`,
            scopeType: "GLOBAL",
            triggers: [{ eventName: triggerEvent }],
            steps: [],
            flowGraph,
          });

        expect(res.status).toBe(201);
        const defId = res.body.data.automation.id as string;
        expect(res.body.data.automation.steps?.length ?? 0).toBe(0);

        const row = await basePrisma.automationDefinition.findUnique({
          where: { id: defId },
          include: { steps: true, triggers: true },
        });
        expect(row?.steps.length).toBe(0);
        expect(row?.flowGraph).toBeTruthy();
        expect(row?.triggers.some((t) => t.eventName === triggerEvent)).toBe(
          true,
        );
      } finally {
        await basePrisma.tenant.delete({ where: { id: tenantId } });
      }
    },
  );

  /** AT-MIG-002 / AT-MIG-003 — legacy body: steps only, no flowGraph; DB stays graph-free. */
  it.skipIf(!databaseUrlConfigured)(
    "AT-MIG-002/003: creates definition with linear steps only (legacy payload)",
    async () => {
      const tenantId = randomUUID();
      const userId = randomUUID();
      const slug = `auto-mig23-${randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const passwordHash = await hashPassword("automation-it-pass");
      const triggerEvent = "inventory.stock.low_detected" as const;

      await basePrisma.tenant.create({
        data: {
          id: tenantId,
          name: "AT-MIG-002 Tenant",
          slug,
          plan: "STARTER",
          isActive: true,
          isTrial: false,
          subscriptionStatus: "ACTIVE",
        },
      });

      await basePrisma.user.create({
        data: {
          id: userId,
          tenantId,
          username: `admin-${slug}`,
          password: passwordHash,
          role: "admin",
        },
      });

      const token = signAdminToken({ userId, tenantId, tenantSlug: slug });

      const stepsPayload = [
        {
          actionType: "notification.send",
          actionConfig: {
            type: "INFO",
            title: "First",
            message: "legacy-1",
          },
        },
        {
          actionType: "notification.send",
          actionConfig: {
            type: "INFO",
            title: "Second",
            message: "legacy-2",
          },
        },
      ];

      try {
        const res = await apiRequest(app)
          .post("/api/v1/automation/definitions")
          .set(withAuth(token))
          .set("Content-Type", "application/json")
          .send({
            name: `MIG23 ${slug.slice(0, 6)}`,
            scopeType: "GLOBAL",
            triggers: [{ eventName: triggerEvent, delayMinutes: 0 }],
            steps: stepsPayload,
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        const auto = res.body.data.automation;
        const defId = auto.id as string;
        expect(auto.steps?.length ?? 0).toBe(2);
        expect(auto.flowGraph == null).toBe(true);

        const getRes = await apiRequest(app)
          .get(`/api/v1/automation/definitions/${defId}`)
          .set(withAuth(token));

        expect(getRes.status).toBe(200);
        const fetched = getRes.body.data.automation;
        expect(fetched.steps?.length ?? 0).toBe(2);
        expect(fetched.flowGraph == null).toBe(true);
        expect(
          fetched.triggers?.some(
            (t: { eventName: string }) => t.eventName === triggerEvent,
          ),
        ).toBe(true);

        const row = await basePrisma.automationDefinition.findUnique({
          where: { id: defId },
          include: { steps: { orderBy: { stepOrder: "asc" } }, triggers: true },
        });
        expect(row?.tenantId).toBe(tenantId);
        expect(row?.steps.length).toBe(2);
        expect(row?.flowGraph == null).toBe(true);
        expect(row?.triggers.length).toBeGreaterThanOrEqual(1);
      } finally {
        await basePrisma.tenant.delete({ where: { id: tenantId } });
      }
    },
  );
});
