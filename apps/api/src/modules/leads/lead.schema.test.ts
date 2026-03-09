import { describe, it, expect } from "vitest";
import {
  CreateLeadSchema,
  UpdateLeadSchema,
  ConvertLeadSchema,
  AssignLeadSchema,
} from "./lead.schema";

describe("CreateLeadSchema", () => {
  it("accepts valid name only", () => {
    const result = CreateLeadSchema.parse({ name: "John Doe" });
    expect(result.name).toBe("John Doe");
  });

  it("accepts all optional fields", () => {
    const result = CreateLeadSchema.parse({
      name: "John",
      email: "john@example.com",
      phone: "+1234567890",
      companyName: "Acme",
      status: "NEW",
      source: "Web",
      notes: "Hot lead",
      assignedToId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.name).toBe("John");
    expect(result.email).toBe("john@example.com");
    expect(result.status).toBe("NEW");
  });

  it("rejects empty name", () => {
    expect(() => CreateLeadSchema.parse({ name: "" })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => CreateLeadSchema.parse({})).toThrow();
  });

  it("rejects invalid status", () => {
    expect(() =>
      CreateLeadSchema.parse({ name: "John", status: "INVALID" }),
    ).toThrow();
  });
});

describe("UpdateLeadSchema", () => {
  it("accepts partial update", () => {
    const result = UpdateLeadSchema.parse({ name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("accepts empty object", () => {
    const result = UpdateLeadSchema.parse({});
    expect(result).toEqual({});
  });
});

describe("ConvertLeadSchema", () => {
  it("accepts empty object", () => {
    const result = ConvertLeadSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts optional fields", () => {
    const result = ConvertLeadSchema.parse({
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      dealName: "New Deal",
      dealValue: 1000,
      pipelineId: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.contactId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(result.dealName).toBe("New Deal");
    expect(result.dealValue).toBe(1000);
  });
});

describe("AssignLeadSchema", () => {
  it("accepts assignedToId", () => {
    const result = AssignLeadSchema.parse({
      assignedToId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.assignedToId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects empty assignedToId", () => {
    expect(() => AssignLeadSchema.parse({ assignedToId: "" })).toThrow();
  });

  it("rejects missing assignedToId", () => {
    expect(() => AssignLeadSchema.parse({})).toThrow();
  });
});
