import { describe, it, expect } from "vitest";
import { applyBlockStyles } from "./block-styles";

describe("applyBlockStyles", () => {
  it("returns empty object when style is undefined", () => {
    expect(applyBlockStyles(undefined)).toEqual({});
  });

  it("returns empty object for empty style", () => {
    expect(applyBlockStyles({})).toEqual({});
  });

  it("maps paddingY + paddingX into a single shorthand", () => {
    const css = applyBlockStyles({ paddingY: "compact", paddingX: "balanced" });
    expect(css.padding).toBe("2rem 1.5rem");
  });

  it("maps paddingY alone without touching paddingX", () => {
    const css = applyBlockStyles({ paddingY: "spacious" });
    expect(css.paddingTop).toBe("calc(var(--section-padding) * 1.75)");
    expect(css.paddingBottom).toBe("calc(var(--section-padding) * 1.75)");
    expect(css.padding).toBeUndefined();
    expect(css.paddingLeft).toBeUndefined();
  });

  it("maps marginY into top + bottom", () => {
    const css = applyBlockStyles({ marginY: "md" });
    expect(css.marginTop).toBe("2rem");
    expect(css.marginBottom).toBe("2rem");
  });

  it("applies backgroundToken as a CSS variable", () => {
    const css = applyBlockStyles({ backgroundToken: "color-surface" });
    expect(css.background).toBe("var(--color-surface)");
  });

  it("stacks overlay over background image", () => {
    const css = applyBlockStyles({
      backgroundImage: "https://cdn.example.com/hero.jpg",
      backgroundOverlay: "dark",
    });
    expect(css.background).toContain("linear-gradient(");
    expect(css.background).toContain("rgba(0,0,0,0.4)");
    expect(css.background).toContain('url("https://cdn.example.com/hero.jpg")');
  });

  it("stacks overlay over backgroundToken when no image", () => {
    const css = applyBlockStyles({
      backgroundToken: "color-surface",
      backgroundOverlay: "light",
    });
    expect(css.background).toContain("linear-gradient(");
    expect(css.background).toContain("var(--color-surface)");
  });

  it("skips background output when overlay is 'none'", () => {
    const css = applyBlockStyles({ backgroundOverlay: "none" });
    expect(css.background).toBeUndefined();
  });

  it("renders brand overlay using color-mix", () => {
    const css = applyBlockStyles({
      backgroundImage: "x.jpg",
      backgroundOverlay: "brand",
    });
    expect(css.background).toContain("color-mix(in srgb, var(--color-primary)");
  });

  it("applies border when borderWidth > 0", () => {
    const css = applyBlockStyles({ borderWidth: 2, borderTone: "accent" });
    expect(css.borderWidth).toBe("2px");
    expect(css.borderStyle).toBe("solid");
    expect(css.borderColor).toBe("var(--color-accent)");
  });

  it("defaults border tone to subtle when borderWidth is set but tone missing", () => {
    const css = applyBlockStyles({ borderWidth: 1 });
    expect(css.borderColor).toBe("var(--color-border)");
  });

  it("skips border when borderWidth is 0", () => {
    const css = applyBlockStyles({ borderWidth: 0, borderTone: "accent" });
    expect(css.borderWidth).toBeUndefined();
    expect(css.borderStyle).toBeUndefined();
  });

  it("maps shadow tokens", () => {
    expect(applyBlockStyles({ shadow: "md" }).boxShadow).toContain("0 4px 6px");
    expect(applyBlockStyles({ shadow: "lg" }).boxShadow).toContain(
      "0 20px 25px",
    );
  });

  it("skips shadow when value is 'none'", () => {
    expect(applyBlockStyles({ shadow: "none" }).boxShadow).toBeUndefined();
  });

  it("maps maxWidth and centers via marginInline when bounded", () => {
    const bounded = applyBlockStyles({ maxWidth: "wide" });
    expect(bounded.maxWidth).toBe("1440px");
    expect(bounded.marginInline).toBe("auto");

    const full = applyBlockStyles({ maxWidth: "full" });
    expect(full.maxWidth).toBe("100%");
    expect(full.marginInline).toBeUndefined();
  });

  it("maps minHeight scales, skipping 'auto'", () => {
    expect(applyBlockStyles({ minHeight: "screen" }).minHeight).toBe("100vh");
    expect(applyBlockStyles({ minHeight: "lg" }).minHeight).toBe("600px");
    expect(applyBlockStyles({ minHeight: "auto" }).minHeight).toBeUndefined();
  });

  it("maps borderRadius tokens", () => {
    expect(applyBlockStyles({ borderRadius: "full" }).borderRadius).toBe(
      "9999px",
    );
    expect(applyBlockStyles({ borderRadius: "md" }).borderRadius).toBe("8px");
    expect(applyBlockStyles({ borderRadius: "none" }).borderRadius).toBe("0");
  });

  it("maps textToken + alignment independently", () => {
    const css = applyBlockStyles({
      textToken: "color-muted",
      alignment: "center",
    });
    expect(css.color).toBe("var(--color-muted)");
    expect(css.textAlign).toBe("center");
  });

  it("does not mutate the input style", () => {
    const input = { shadow: "sm" as const, paddingY: "compact" as const };
    applyBlockStyles(input);
    expect(Object.keys(input).sort()).toEqual(["paddingY", "shadow"]);
  });
});
