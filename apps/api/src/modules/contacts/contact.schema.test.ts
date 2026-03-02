import { describe, it, expect } from "vitest";
import {
  CreateContactSchema,
  UpdateContactSchema,
  CreateTagSchema,
  AddNoteSchema,
  AddCommunicationSchema,
} from "./contact.schema";

describe("CreateContactSchema", () => {
  it("accepts valid firstName only", () => {
    const result = CreateContactSchema.parse({ firstName: "John" });
    expect(result.firstName).toBe("John");
  });

  it("accepts all optional fields", () => {
    const result = CreateContactSchema.parse({
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+1234567890",
      companyId: "550e8400-e29b-41d4-a716-446655440000",
      tagIds: [],
    });
    expect(result.email).toBe("john@example.com");
  });

  it("rejects empty firstName", () => {
    expect(() => CreateContactSchema.parse({ firstName: "" })).toThrow();
  });

  it("rejects invalid email", () => {
    expect(() =>
      CreateContactSchema.parse({
        firstName: "John",
        email: "not-an-email",
      }),
    ).toThrow();
  });
});

describe("CreateTagSchema", () => {
  it("accepts valid name", () => {
    const result = CreateTagSchema.parse({ name: "VIP" });
    expect(result.name).toBe("VIP");
  });

  it("rejects empty name", () => {
    expect(() => CreateTagSchema.parse({ name: "" })).toThrow();
  });
});

describe("AddNoteSchema", () => {
  it("accepts valid content", () => {
    const result = AddNoteSchema.parse({ content: "Some note" });
    expect(result.content).toBe("Some note");
  });

  it("rejects empty content", () => {
    expect(() => AddNoteSchema.parse({ content: "" })).toThrow();
  });
});

describe("AddCommunicationSchema", () => {
  it("accepts valid type", () => {
    const result = AddCommunicationSchema.parse({ type: "CALL" });
    expect(result.type).toBe("CALL");
  });

  it("rejects invalid type", () => {
    expect(() => AddCommunicationSchema.parse({ type: "INVALID" })).toThrow();
  });
});
