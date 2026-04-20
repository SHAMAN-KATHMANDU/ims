import { describe, it, expect } from "vitest";
import { NavSlotEnum, UpsertNavMenuSchema } from "./nav-menus.schema";

describe("NavSlotEnum", () => {
  it.each(["header-primary", "footer-1", "footer-2", "mobile-drawer"])(
    "accepts valid slot %s",
    (slot) => {
      expect(() => NavSlotEnum.parse(slot)).not.toThrow();
    },
  );

  it("rejects an unknown slot", () => {
    expect(() => NavSlotEnum.parse("sidebar")).toThrow();
  });
});

describe("UpsertNavMenuSchema", () => {
  const minimalItemsOnly = { items: [] };

  const fullNavConfig = {
    layout: "standard" as const,
    behavior: "sticky" as const,
    items: [],
    mobile: { drawerStyle: "slide-right" as const, showSearch: false },
    showCart: true,
    showSearch: false,
    showAccount: false,
  };

  it("accepts NavItemsOnly with an empty items array", () => {
    const result = UpsertNavMenuSchema.parse({
      slot: "header-primary",
      items: minimalItemsOnly,
    });
    expect(result.slot).toBe("header-primary");
  });

  it("accepts NavItemsOnly with valid link items", () => {
    const result = UpsertNavMenuSchema.parse({
      slot: "footer-1",
      items: {
        items: [{ kind: "link", label: "About", href: "/about" }],
      },
    });
    expect(result.slot).toBe("footer-1");
  });

  it("accepts a full NavConfig for header-primary", () => {
    const result = UpsertNavMenuSchema.parse({
      slot: "header-primary",
      items: fullNavConfig,
    });
    expect(result.slot).toBe("header-primary");
  });

  it("accepts NavConfig with cta button", () => {
    const result = UpsertNavMenuSchema.parse({
      slot: "header-primary",
      items: {
        ...fullNavConfig,
        cta: {
          label: "Shop Now",
          href: "/products",
          style: "primary" as const,
        },
      },
    });
    expect(result.slot).toBe("header-primary");
  });

  it("accepts footer-2 and mobile-drawer slots", () => {
    for (const slot of ["footer-2", "mobile-drawer"] as const) {
      const result = UpsertNavMenuSchema.parse({
        slot,
        items: minimalItemsOnly,
      });
      expect(result.slot).toBe(slot);
    }
  });

  it("rejects invalid slot", () => {
    expect(() =>
      UpsertNavMenuSchema.parse({ slot: "invalid", items: minimalItemsOnly }),
    ).toThrow();
  });

  it("rejects missing slot field", () => {
    expect(() =>
      UpsertNavMenuSchema.parse({ items: minimalItemsOnly }),
    ).toThrow();
  });

  it("rejects missing items field", () => {
    expect(() => UpsertNavMenuSchema.parse({ slot: "footer-1" })).toThrow();
  });

  it("rejects extra fields on the outer object (strict mode)", () => {
    expect(() =>
      UpsertNavMenuSchema.parse({
        slot: "footer-1",
        items: minimalItemsOnly,
        extra: true,
      }),
    ).toThrow();
  });

  it("rejects a nav item missing the kind discriminator", () => {
    expect(() =>
      UpsertNavMenuSchema.parse({
        slot: "footer-1",
        items: { items: [{ label: "About", href: "/about" }] },
      }),
    ).toThrow();
  });
});
