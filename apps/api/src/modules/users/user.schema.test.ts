import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamsSchema,
  userListQuerySchema,
} from "./user.schema";

describe("user schemas", () => {
  it("validates createUserSchema and trims username", () => {
    const parsed = createUserSchema.parse({
      username: "  newuser ",
      password: "secret123",
      role: "admin",
    });

    expect(parsed.username).toBe("newuser");
    expect(parsed.role).toBe("admin");
  });

  it("rejects empty required create fields", () => {
    const result = createUserSchema.safeParse({
      username: " ",
      password: "",
      role: "user",
    });

    expect(result.success).toBe(false);
  });

  it("validates updateUserSchema partial payload", () => {
    const parsed = updateUserSchema.parse({
      username: "  another-user ",
      role: "superAdmin",
    });

    expect(parsed.username).toBe("another-user");
    expect(parsed.role).toBe("superAdmin");
  });

  it("validates userIdParamsSchema", () => {
    const parsed = userIdParamsSchema.parse({ id: "user-1" });
    expect(parsed.id).toBe("user-1");
  });

  it("validates userListQuerySchema", () => {
    const parsed = userListQuerySchema.parse({
      page: "3",
      limit: "15",
      search: "  admin ",
      sortBy: "username",
      sortOrder: "asc",
    });

    expect(parsed.page).toBe(3);
    expect(parsed.limit).toBe(15);
    expect(parsed.search).toBe("admin");
    expect(parsed.sortBy).toBe("username");
    expect(parsed.sortOrder).toBe("asc");
  });
});
