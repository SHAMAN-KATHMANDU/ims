import path from "path";
import { describe, expect, it } from "vitest";
import {
  getUploadCleanupCutoff,
  resolveLocalMessagingMediaAbsolutePath,
  UPLOAD_RETENTION_DAYS,
} from "./uploadCleanup";

describe("uploadCleanup helpers", () => {
  describe("getUploadCleanupCutoff", () => {
    it("is approximately UPLOAD_RETENTION_DAYS in the past", () => {
      const cutoff = getUploadCleanupCutoff();
      const now = Date.now();
      const minMs = (UPLOAD_RETENTION_DAYS - 1) * 24 * 60 * 60 * 1000;
      const maxMs = (UPLOAD_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000;
      const diff = now - cutoff.getTime();
      expect(diff).toBeGreaterThanOrEqual(minMs);
      expect(diff).toBeLessThanOrEqual(maxMs);
    });
  });

  describe("resolveLocalMessagingMediaAbsolutePath", () => {
    it("returns null for non-strings and empty", () => {
      expect(resolveLocalMessagingMediaAbsolutePath(null)).toBeNull();
      expect(resolveLocalMessagingMediaAbsolutePath(undefined)).toBeNull();
      expect(resolveLocalMessagingMediaAbsolutePath("")).toBeNull();
      expect(resolveLocalMessagingMediaAbsolutePath("   ")).toBeNull();
    });

    it("returns null for external URLs without uploads/messaging", () => {
      expect(
        resolveLocalMessagingMediaAbsolutePath("https://cdn.example.com/x.jpg"),
      ).toBeNull();
    });

    it("resolves absolute https URL to cwd uploads/messaging file", () => {
      const raw =
        "https://api.example.com/uploads/messaging/msg-123.jpg?x=1#frag";
      const got = resolveLocalMessagingMediaAbsolutePath(raw);
      expect(got).toBe(
        path.join(process.cwd(), "uploads", "messaging", "msg-123.jpg"),
      );
    });

    it("resolves path-style /uploads/messaging/ URL", () => {
      const got = resolveLocalMessagingMediaAbsolutePath(
        "/uploads/messaging/msg-9.png",
      );
      expect(got).toBe(
        path.join(process.cwd(), "uploads", "messaging", "msg-9.png"),
      );
    });

    it("returns null for path traversal", () => {
      expect(
        resolveLocalMessagingMediaAbsolutePath(
          "/uploads/messaging/../secrets.env",
        ),
      ).toBeNull();
    });
  });
});
