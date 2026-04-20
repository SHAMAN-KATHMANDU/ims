import { describe, it, expect } from "vitest";
import {
  BlockStyleSchema,
  DEFAULT_BLOCK_STYLE,
  resolveBlockStyle,
} from "./block-styles";

describe("BlockStyleSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(BlockStyleSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a fully-populated style", () => {
    const style = {
      paddingY: "spacious",
      paddingX: "balanced",
      marginY: "lg",
      backgroundToken: "surface-muted",
      backgroundImage: "https://cdn.example.com/bg.jpg",
      backgroundOverlay: "dark",
      textToken: "text-inverse",
      alignment: "center",
      borderWidth: 2,
      borderTone: "accent",
      borderRadius: "lg",
      shadow: "md",
      maxWidth: "wide",
      minHeight: "screen",
    };
    const parsed = BlockStyleSchema.safeParse(style);
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown fields (strict)", () => {
    const result = BlockStyleSchema.safeParse({ bogus: "value" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid enum values", () => {
    expect(BlockStyleSchema.safeParse({ paddingY: "giant" }).success).toBe(
      false,
    );
    expect(BlockStyleSchema.safeParse({ shadow: "huge" }).success).toBe(false);
    expect(BlockStyleSchema.safeParse({ borderWidth: 3 }).success).toBe(false);
  });

  it("trims and caps string fields", () => {
    const long = "x".repeat(1001);
    expect(BlockStyleSchema.safeParse({ backgroundImage: long }).success).toBe(
      false,
    );
  });
});

describe("resolveBlockStyle", () => {
  it("returns DEFAULT_BLOCK_STYLE when override is undefined", () => {
    expect(resolveBlockStyle(undefined)).toEqual(DEFAULT_BLOCK_STYLE);
  });

  it("merges a partial override over the defaults", () => {
    const resolved = resolveBlockStyle({ shadow: "lg", paddingY: "compact" });
    expect(resolved.shadow).toBe("lg");
    expect(resolved.paddingY).toBe("compact");
    expect(resolved.marginY).toBe(DEFAULT_BLOCK_STYLE.marginY);
    expect(resolved.maxWidth).toBe(DEFAULT_BLOCK_STYLE.maxWidth);
  });

  it("override wins over default for every field it sets", () => {
    const resolved = resolveBlockStyle({
      paddingY: "none",
      paddingX: "spacious",
      marginY: "lg",
      alignment: "end",
      borderWidth: 4,
      borderTone: "accent",
      borderRadius: "full",
      shadow: "md",
      maxWidth: "full",
      minHeight: "screen",
      backgroundOverlay: "brand",
    });
    expect(resolved.paddingY).toBe("none");
    expect(resolved.paddingX).toBe("spacious");
    expect(resolved.marginY).toBe("lg");
    expect(resolved.alignment).toBe("end");
    expect(resolved.borderWidth).toBe(4);
    expect(resolved.borderTone).toBe("accent");
    expect(resolved.borderRadius).toBe("full");
    expect(resolved.shadow).toBe("md");
    expect(resolved.maxWidth).toBe("full");
    expect(resolved.minHeight).toBe("screen");
    expect(resolved.backgroundOverlay).toBe("brand");
  });

  it("does not mutate the input override", () => {
    const override = { shadow: "sm" as const };
    resolveBlockStyle(override);
    expect(Object.keys(override)).toEqual(["shadow"]);
  });
});
