import { describe, it, expect } from "vitest";
import { NotificationListQuerySchema } from "./notification.schema";

describe("NotificationListQuerySchema", () => {
  it("defaults limit to 20 when empty", () => {
    const result = NotificationListQuerySchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.unreadOnly).toBe(false);
  });

  it("parses limit from query", () => {
    const result = NotificationListQuerySchema.parse({ limit: "50" });
    expect(result.limit).toBe(50);
  });

  it("caps limit at 100", () => {
    const result = NotificationListQuerySchema.parse({ limit: "200" });
    expect(result.limit).toBe(100);
  });

  it("parses unreadOnly true", () => {
    const result = NotificationListQuerySchema.parse({ unreadOnly: "true" });
    expect(result.unreadOnly).toBe(true);
  });
});
