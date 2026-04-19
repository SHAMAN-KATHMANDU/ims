import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("file-type", () => ({
  default: { fromFile: vi.fn() },
}));
vi.mock("fs", () => ({
  default: { unlinkSync: vi.fn() },
}));

import FileType from "file-type";
import fs from "fs";
import {
  MESSAGING_MEDIA_MAGIC_ALLOWED,
  messagingMediaKind,
  validateMessagingMediaMagicBytes,
  unlinkSilent,
} from "./messaging-upload.validation";

const mockedFromFile = FileType.fromFile as unknown as ReturnType<typeof vi.fn>;
const mockedUnlinkSync = fs.unlinkSync as unknown as ReturnType<typeof vi.fn>;

describe("MESSAGING_MEDIA_MAGIC_ALLOWED", () => {
  it("contains the expected image MIME types", () => {
    expect(MESSAGING_MEDIA_MAGIC_ALLOWED.has("image/jpeg")).toBe(true);
    expect(MESSAGING_MEDIA_MAGIC_ALLOWED.has("image/png")).toBe(true);
    expect(MESSAGING_MEDIA_MAGIC_ALLOWED.has("image/gif")).toBe(true);
    expect(MESSAGING_MEDIA_MAGIC_ALLOWED.has("image/webp")).toBe(true);
  });

  it("contains the expected video MIME types", () => {
    expect(MESSAGING_MEDIA_MAGIC_ALLOWED.has("video/mp4")).toBe(true);
    expect(MESSAGING_MEDIA_MAGIC_ALLOWED.has("video/quicktime")).toBe(true);
    expect(MESSAGING_MEDIA_MAGIC_ALLOWED.has("video/webm")).toBe(true);
  });

  it("does not allow arbitrary document/archive types", () => {
    expect(MESSAGING_MEDIA_MAGIC_ALLOWED.has("application/pdf")).toBe(false);
    expect(MESSAGING_MEDIA_MAGIC_ALLOWED.has("application/zip")).toBe(false);
    expect(MESSAGING_MEDIA_MAGIC_ALLOWED.has("text/html")).toBe(false);
    expect(MESSAGING_MEDIA_MAGIC_ALLOWED.has("image/svg+xml")).toBe(false);
  });
});

describe("messagingMediaKind", () => {
  it("classifies video/* MIME as 'video'", () => {
    expect(messagingMediaKind("video/mp4")).toBe("video");
    expect(messagingMediaKind("video/quicktime")).toBe("video");
    expect(messagingMediaKind("video/webm")).toBe("video");
  });

  it("classifies image/* MIME as 'image'", () => {
    expect(messagingMediaKind("image/jpeg")).toBe("image");
    expect(messagingMediaKind("image/png")).toBe("image");
  });

  it("defaults to 'image' for non-video MIME types (fall-through branch)", () => {
    // Safety net — anything not starting with "video/" is treated as image.
    expect(messagingMediaKind("application/octet-stream")).toBe("image");
    expect(messagingMediaKind("")).toBe("image");
  });
});

describe("validateMessagingMediaMagicBytes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the mime when magic bytes match an allowed image type", async () => {
    mockedFromFile.mockResolvedValue({ ext: "jpg", mime: "image/jpeg" });
    const result = await validateMessagingMediaMagicBytes("/tmp/a.jpg");
    expect(result).toEqual({ mime: "image/jpeg" });
    expect(mockedFromFile).toHaveBeenCalledWith("/tmp/a.jpg");
  });

  it("returns the mime when magic bytes match an allowed video type", async () => {
    mockedFromFile.mockResolvedValue({ ext: "mp4", mime: "video/mp4" });
    const result = await validateMessagingMediaMagicBytes("/tmp/a.mp4");
    expect(result).toEqual({ mime: "video/mp4" });
  });

  it("returns null when detected mime is not in the allow-list", async () => {
    mockedFromFile.mockResolvedValue({ ext: "pdf", mime: "application/pdf" });
    const result = await validateMessagingMediaMagicBytes("/tmp/a.pdf");
    expect(result).toBeNull();
  });

  it("returns null when file-type fails to detect anything", async () => {
    mockedFromFile.mockResolvedValue(undefined);
    const result = await validateMessagingMediaMagicBytes("/tmp/unknown.bin");
    expect(result).toBeNull();
  });

  it("returns null when detected mime is missing on the result object", async () => {
    mockedFromFile.mockResolvedValue({ ext: "bin" });
    const result = await validateMessagingMediaMagicBytes("/tmp/empty-mime");
    expect(result).toBeNull();
  });

  it("returns null for an SVG — magic-byte check rejects even an 'image/*' that is not in the allow-list", async () => {
    mockedFromFile.mockResolvedValue({ ext: "svg", mime: "image/svg+xml" });
    const result = await validateMessagingMediaMagicBytes("/tmp/a.svg");
    expect(result).toBeNull();
  });
});

describe("unlinkSilent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls fs.unlinkSync with the provided path", () => {
    unlinkSilent("/tmp/delete-me.jpg");
    expect(mockedUnlinkSync).toHaveBeenCalledWith("/tmp/delete-me.jpg");
  });

  it("swallows errors thrown by fs.unlinkSync", () => {
    mockedUnlinkSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    // Must not throw — cleanup is best-effort.
    expect(() => unlinkSilent("/tmp/missing.jpg")).not.toThrow();
  });

  it("returns undefined (no value leak)", () => {
    mockedUnlinkSync.mockImplementation(() => {});
    expect(unlinkSilent("/tmp/ok.jpg")).toBeUndefined();
  });
});
