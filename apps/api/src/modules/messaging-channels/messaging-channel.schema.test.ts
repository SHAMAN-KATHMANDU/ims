import { describe, expect, it } from "vitest";
import {
  CompleteManualConnectSchema,
  RegisterManualWebhookVerifySchema,
} from "./messaging-channel.schema";

describe("RegisterManualWebhookVerifySchema", () => {
  it("accepts valid payload", () => {
    const parsed = RegisterManualWebhookVerifySchema.parse({
      provider: "FACEBOOK_MESSENGER",
      webhookVerifyToken: "my-secret-token",
    });
    expect(parsed.webhookVerifyToken).toBe("my-secret-token");
  });

  it("rejects empty verify token", () => {
    expect(() =>
      RegisterManualWebhookVerifySchema.parse({
        provider: "FACEBOOK_MESSENGER",
        webhookVerifyToken: "",
      }),
    ).toThrow();
  });

  it("rejects token over 255 chars", () => {
    expect(() =>
      RegisterManualWebhookVerifySchema.parse({
        provider: "FACEBOOK_MESSENGER",
        webhookVerifyToken: "x".repeat(256),
      }),
    ).toThrow();
  });
});

describe("CompleteManualConnectSchema", () => {
  it("accepts valid payload", () => {
    const parsed = CompleteManualConnectSchema.parse({
      pageId: "123",
      pageAccessToken: "token",
      pageName: "My Page",
    });
    expect(parsed.pageId).toBe("123");
  });

  it("rejects missing pageId", () => {
    expect(() =>
      CompleteManualConnectSchema.parse({
        pageAccessToken: "t",
        pageName: "P",
      }),
    ).toThrow();
  });
});
