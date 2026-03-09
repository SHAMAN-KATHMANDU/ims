import { describe, it, expect } from "vitest";
import {
  LoginSchema,
  RegisterSchema,
  ChangePasswordSchema,
} from "./auth.schema";

describe("LoginSchema", () => {
  it("accepts valid username and password", () => {
    const result = LoginSchema.parse({
      username: "user",
      password: "secret",
    });
    expect(result.username).toBe("user");
    expect(result.password).toBe("secret");
  });

  it("normalizes username to lowercase", () => {
    const result = LoginSchema.parse({
      username: "User",
      password: "pass",
    });
    expect(result.username).toBe("user");
  });

  it("trims username whitespace", () => {
    const result = LoginSchema.parse({
      username: "  user  ",
      password: "pass",
    });
    expect(result.username).toBe("user");
  });

  it("rejects empty username after trim", () => {
    expect(() =>
      LoginSchema.parse({ username: "   ", password: "pass" }),
    ).toThrow();
  });

  it("rejects missing username", () => {
    expect(() => LoginSchema.parse({ password: "pass" })).toThrow();
  });

  it("rejects missing password", () => {
    expect(() => LoginSchema.parse({ username: "user" })).toThrow();
  });

  it("rejects empty password", () => {
    expect(() =>
      LoginSchema.parse({ username: "user", password: "" }),
    ).toThrow();
  });
});

describe("RegisterSchema", () => {
  it("accepts valid register data", () => {
    const result = RegisterSchema.parse({
      username: "newuser",
      password: "password123",
    });
    expect(result.username).toBe("newuser");
    expect(result.password).toBe("password123");
    expect(result.role).toBe("user");
  });

  it("accepts explicit role", () => {
    const result = RegisterSchema.parse({
      username: "admin",
      password: "password123",
      role: "admin",
    });
    expect(result.role).toBe("admin");
  });

  it("rejects password shorter than 8 characters", () => {
    expect(() =>
      RegisterSchema.parse({ username: "user", password: "short" }),
    ).toThrow();
  });
});

describe("ChangePasswordSchema", () => {
  it("accepts valid change password data", () => {
    const result = ChangePasswordSchema.parse({
      currentPassword: "oldpass",
      newPassword: "newpassword123",
    });
    expect(result.currentPassword).toBe("oldpass");
    expect(result.newPassword).toBe("newpassword123");
  });

  it("rejects empty current password", () => {
    expect(() =>
      ChangePasswordSchema.parse({
        currentPassword: "",
        newPassword: "newpass123",
      }),
    ).toThrow();
  });

  it("rejects new password shorter than 8 characters", () => {
    expect(() =>
      ChangePasswordSchema.parse({
        currentPassword: "oldpass",
        newPassword: "short",
      }),
    ).toThrow();
  });
});
