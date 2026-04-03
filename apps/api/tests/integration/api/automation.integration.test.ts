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
import { compileLinearStepsToFlowGraph } from "@repo/shared";

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
});
