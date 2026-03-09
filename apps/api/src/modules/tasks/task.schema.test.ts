import { describe, it, expect } from "vitest";
import { CreateTaskSchema, UpdateTaskSchema } from "./task.schema";

describe("CreateTaskSchema", () => {
  it("accepts valid title only", () => {
    const result = CreateTaskSchema.parse({ title: "Follow up" });
    expect(result.title).toBe("Follow up");
  });

  it("accepts optional fields", () => {
    const result = CreateTaskSchema.parse({
      title: "Call",
      dueDate: "2024-01-15",
      contactId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.dueDate).toBe("2024-01-15");
  });

  it("rejects empty title", () => {
    expect(() => CreateTaskSchema.parse({ title: "" })).toThrow();
  });
});

describe("UpdateTaskSchema", () => {
  it("accepts completed flag", () => {
    const result = UpdateTaskSchema.parse({ completed: true });
    expect(result.completed).toBe(true);
  });
});
