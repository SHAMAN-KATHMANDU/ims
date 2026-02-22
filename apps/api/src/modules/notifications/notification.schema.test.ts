import { describe, expect, it } from "vitest";
import {
  notificationIdParamsSchema,
  notificationsListQuerySchema,
} from "./notification.schema";

describe("notification schemas", () => {
  it("validates notificationsListQuerySchema", () => {
    const parsed = notificationsListQuerySchema.parse({
      limit: "50",
      unreadOnly: "true",
    });

    expect(parsed.limit).toBe(50);
    expect(parsed.unreadOnly).toBe(true);
  });

  it("validates notificationIdParamsSchema", () => {
    const parsed = notificationIdParamsSchema.parse({ id: "notif-1" });
    expect(parsed.id).toBe("notif-1");
  });
});
