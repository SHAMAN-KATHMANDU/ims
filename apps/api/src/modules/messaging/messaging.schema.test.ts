import { describe, it, expect } from "vitest";
import {
  SendMessageSchema,
  AddReactionSchema,
  EditMessageSchema,
} from "./messaging.schema";

describe("SendMessageSchema", () => {
  it("accepts long text without max length", () => {
    const long = "a".repeat(50_000);
    const parsed = SendMessageSchema.parse({ text: long });
    expect(parsed.text).toBe(long);
  });

  it("accepts absolute mediaUrl with optional caption", () => {
    const parsed = SendMessageSchema.parse({
      mediaUrl: "https://example.com/a.jpg",
      mediaType: "image",
      text: "caption",
    });
    expect(parsed.mediaUrl).toBe("https://example.com/a.jpg");
  });

  it("accepts /uploads/messaging/ relative path", () => {
    const parsed = SendMessageSchema.parse({
      mediaUrl: "/uploads/messaging/msg-1.jpg",
      mediaType: "image",
    });
    expect(parsed.mediaUrl).toContain("/uploads/messaging/");
  });

  it("rejects mediaUrl that is not http(s) or messaging upload path", () => {
    expect(() =>
      SendMessageSchema.parse({
        mediaUrl: "/etc/passwd",
        mediaType: "image",
      }),
    ).toThrow();
  });

  it("accepts mediaAssetId without mediaUrl (library-backed upload)", () => {
    const parsed = SendMessageSchema.parse({
      mediaAssetId: "550e8400-e29b-41d4-a716-446655440000",
      mediaType: "image",
    });
    expect(parsed.mediaAssetId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("requires text or mediaUrl or mediaAssetId", () => {
    expect(() => SendMessageSchema.parse({})).toThrow();
  });

  it("trims text", () => {
    const parsed = SendMessageSchema.parse({ text: "  hi  " });
    expect(parsed.text).toBe("hi");
  });

  it("accepts optional replyToId with text", () => {
    const parsed = SendMessageSchema.parse({
      text: "replying",
      replyToId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(parsed.replyToId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });
});

describe("AddReactionSchema", () => {
  it("accepts emoji string", () => {
    const parsed = AddReactionSchema.parse({ emoji: "👍" });
    expect(parsed.emoji).toBe("👍");
  });

  it("rejects empty emoji", () => {
    expect(() => AddReactionSchema.parse({ emoji: "   " })).toThrow();
  });

  it("rejects emoji longer than 32 chars", () => {
    expect(() => AddReactionSchema.parse({ emoji: "a".repeat(33) })).toThrow();
  });
});

describe("EditMessageSchema", () => {
  it("accepts non-empty text", () => {
    const parsed = EditMessageSchema.parse({ text: "updated" });
    expect(parsed.text).toBe("updated");
  });

  it("rejects empty text", () => {
    expect(() => EditMessageSchema.parse({ text: "   " })).toThrow();
  });
});
