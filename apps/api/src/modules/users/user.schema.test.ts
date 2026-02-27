import { describe, it, expect } from "vitest";
import { CreateUserSchema, UpdateUserSchema } from "./user.schema";

describe("CreateUserSchema", () => {
  it("accepts valid username, password, and role", () => {
    const result = CreateUserSchema.parse({
      username: "Alice",
      password: "secret123",
      role: "admin",
    });
    expect(result).toEqual({
      username: "alice",
      password: "secret123",
      role: "admin",
    });
  });

  it("normalizes username to lowercase and trims whitespace", () => {
    const result = CreateUserSchema.parse({
      username: "  BOB  ",
      password: "pass123",
      role: "user",
    });
    expect(result.username).toBe("bob");
  });

  it("rejects missing username", () => {
    expect(() =>
      CreateUserSchema.parse({ password: "pass123", role: "admin" }),
    ).toThrow();
  });

  it("rejects empty username", () => {
    expect(() =>
      CreateUserSchema.parse({
        username: "",
        password: "pass123",
        role: "admin",
      }),
    ).toThrow();
  });

  it("rejects username exceeding 100 characters", () => {
    expect(() =>
      CreateUserSchema.parse({
        username: "a".repeat(101),
        password: "pass123",
        role: "admin",
      }),
    ).toThrow();
  });

  it("rejects password shorter than 6 characters", () => {
    expect(() =>
      CreateUserSchema.parse({
        username: "alice",
        password: "abc",
        role: "admin",
      }),
    ).toThrow();
  });

  it("rejects missing password", () => {
    expect(() =>
      CreateUserSchema.parse({ username: "alice", role: "admin" }),
    ).toThrow();
  });

  it("rejects invalid role", () => {
    expect(() =>
      CreateUserSchema.parse({
        username: "alice",
        password: "pass123",
        role: "owner",
      }),
    ).toThrow();
  });

  it("accepts all valid roles", () => {
    const roles = ["platformAdmin", "superAdmin", "admin", "user"] as const;
    for (const role of roles) {
      const result = CreateUserSchema.parse({
        username: "alice",
        password: "pass123",
        role,
      });
      expect(result.role).toBe(role);
    }
  });
});

describe("UpdateUserSchema", () => {
  it("accepts partial update with only username", () => {
    const result = UpdateUserSchema.parse({ username: "NewName" });
    expect(result.username).toBe("newname");
  });

  it("accepts partial update with only password", () => {
    const result = UpdateUserSchema.parse({ password: "newpass123" });
    expect(result.password).toBe("newpass123");
  });

  it("accepts partial update with only role", () => {
    const result = UpdateUserSchema.parse({ role: "admin" });
    expect(result.role).toBe("admin");
  });

  it("accepts all fields at once", () => {
    const result = UpdateUserSchema.parse({
      username: "Alice",
      password: "newpass123",
      role: "superAdmin",
    });
    expect(result.username).toBe("alice");
    expect(result.role).toBe("superAdmin");
  });

  it("rejects empty object (no fields provided)", () => {
    expect(() => UpdateUserSchema.parse({})).toThrow();
  });

  it("rejects password shorter than 6 characters", () => {
    expect(() => UpdateUserSchema.parse({ password: "abc" })).toThrow();
  });

  it("rejects invalid role", () => {
    expect(() => UpdateUserSchema.parse({ role: "owner" })).toThrow();
  });

  it("rejects empty username string", () => {
    expect(() => UpdateUserSchema.parse({ username: "" })).toThrow();
  });
});
