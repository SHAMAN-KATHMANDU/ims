import { describe, it, expect } from "vitest";
import { parseHostHeader } from "./host";

describe("parseHostHeader", () => {
  it("parses a plain hostname", () => {
    expect(parseHostHeader("example.com")).toBe("example.com");
  });

  it("strips the port from hostname:port", () => {
    expect(parseHostHeader("example.com:3000")).toBe("example.com");
  });

  it("lowercases the hostname", () => {
    expect(parseHostHeader("EXAMPLE.COM")).toBe("example.com");
  });

  it("lowercases hostname after stripping port", () => {
    expect(parseHostHeader("EXAMPLE.COM:3000")).toBe("example.com");
  });

  it("handles bracketed IPv6 without port", () => {
    expect(parseHostHeader("[::1]")).toBe("[::1]");
  });

  it("handles bracketed IPv6 with port", () => {
    expect(parseHostHeader("[::1]:3000")).toBe("[::1]");
  });

  it("handles full IPv6 address with port", () => {
    expect(parseHostHeader("[2001:db8::1]:8000")).toBe("[2001:db8::1]");
  });

  it("lowercases bracketed IPv6", () => {
    expect(parseHostHeader("[::1A]:3000")).toBe("[::1a]");
  });

  it("returns empty string for empty input", () => {
    expect(parseHostHeader("")).toBe("");
  });

  it("returns empty string for malformed bracketed IPv6", () => {
    expect(parseHostHeader("[unclosed")).toBe("");
  });

  it("does not throw on weird input", () => {
    expect(() => parseHostHeader("[unclosed")).not.toThrow();
  });

  it("handles localhost", () => {
    expect(parseHostHeader("localhost:3000")).toBe("localhost");
  });

  it("handles 127.0.0.1", () => {
    expect(parseHostHeader("127.0.0.1:3000")).toBe("127.0.0.1");
  });
});
