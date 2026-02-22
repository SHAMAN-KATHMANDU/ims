import { describe, it, expect } from "vitest";
import {
  assignLeadSchema,
  createLeadSchema,
  leadIdParamsSchema,
  leadListQuerySchema,
  updateLeadSchema,
} from "./lead.schema";

describe("lead schemas", () => {
  it("validates createLeadSchema and trims fields", () => {
    const parsed = createLeadSchema.parse({
      name: "  New Lead ",
      email: " lead@example.com ",
      status: "NEW",
    });

    expect(parsed.name).toBe("New Lead");
    expect(parsed.email).toBe("lead@example.com");
    expect(parsed.status).toBe("NEW");
  });

  it("rejects empty lead name", () => {
    const result = createLeadSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("validates partial update schema", () => {
    const parsed = updateLeadSchema.parse({
      notes: "  follow up tomorrow ",
      status: "CONTACTED",
    });

    expect(parsed.notes).toBe("follow up tomorrow");
    expect(parsed.status).toBe("CONTACTED");
  });

  it("rejects invalid status", () => {
    const result = updateLeadSchema.safeParse({
      status: "PENDING",
    });
    expect(result.success).toBe(false);
  });

  it("validates assignLeadSchema", () => {
    const parsed = assignLeadSchema.parse({ assignedToId: " user-1 " });
    expect(parsed.assignedToId).toBe("user-1");
  });

  it("validates lead params and list query schemas", () => {
    const params = leadIdParamsSchema.parse({ id: "lead-1" });
    const query = leadListQuerySchema.parse({
      status: "QUALIFIED",
      page: "1",
      limit: "10",
    });

    expect(params.id).toBe("lead-1");
    expect(query.status).toBe("QUALIFIED");
    expect(query.limit).toBe(10);
  });
});
