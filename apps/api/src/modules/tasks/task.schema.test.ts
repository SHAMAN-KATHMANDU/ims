import { describe, it, expect } from "vitest";
import {
  createTaskSchema,
  taskIdParamsSchema,
  taskListQuerySchema,
  updateTaskSchema,
} from "./task.schema";

describe("task schemas", () => {
  it("validates createTaskSchema and trims title", () => {
    const parsed = createTaskSchema.parse({
      title: "  Follow up call ",
      assignedToId: " user-1 ",
    });

    expect(parsed.title).toBe("Follow up call");
    expect(parsed.assignedToId).toBe("user-1");
  });

  it("rejects empty title on create", () => {
    const result = createTaskSchema.safeParse({ title: "   " });
    expect(result.success).toBe(false);
  });

  it("validates updateTaskSchema partial payload", () => {
    const parsed = updateTaskSchema.parse({
      title: "  Updated title ",
      completed: true,
    });

    expect(parsed.title).toBe("Updated title");
    expect(parsed.completed).toBe(true);
  });

  it("rejects invalid dueDate", () => {
    const result = updateTaskSchema.safeParse({ dueDate: "tomorrow" });
    expect(result.success).toBe(false);
  });

  it("validates task params and list query schemas", () => {
    const params = taskIdParamsSchema.parse({ id: "task-1" });
    const query = taskListQuerySchema.parse({
      completed: "true",
      dueToday: "false",
      page: "2",
      limit: "15",
    });

    expect(params.id).toBe("task-1");
    expect(query.completed).toBe(true);
    expect(query.dueToday).toBe(false);
    expect(query.page).toBe(2);
  });
});
