import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (class name merge)", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const show = true;
    const hide = false;
    expect(cn("base", hide && "hidden", show && "visible")).toBe("base visible");
  });

  it("deduplicates tailwind classes", () => {
    const result = cn("p-4", "p-2");
    expect(result).toContain("p-2");
  });
});
