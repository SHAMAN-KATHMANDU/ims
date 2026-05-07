import { describe, it, expect } from "vitest";
import { NavSlotEnum, UpsertNavMenuSchema } from "./nav-menus.schema";

describe("NavSlotEnum", () => {
  it.each([
    "header-primary",
    "footer-1",
    "footer-2",
    "mobile-drawer",
    "footer-config",
  ])("accepts valid slot %s", (slot) => {
    expect(() => NavSlotEnum.parse(slot)).not.toThrow();
  });

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

describe("UpsertNavMenuSchema with FooterConfig", () => {
  const minimalFooterConfig = {
    layout: "columns" as const,
    background: "default" as const,
    brand: {},
    columns: [],
    socials: [],
    newsletter: {
      enabled: false,
    },
    legal: {
      showYear: true,
      links: [],
    },
  };

  it("accepts a valid FooterConfig for footer-config slot", () => {
    const result = UpsertNavMenuSchema.parse({
      slot: "footer-config",
      items: minimalFooterConfig,
    });
    expect(result.slot).toBe("footer-config");
  });

  it("accepts a FooterConfig with brand logo and name", () => {
    const result = UpsertNavMenuSchema.parse({
      slot: "footer-config",
      items: {
        ...minimalFooterConfig,
        brand: {
          logoUrl: "https://example.com/logo.png",
          logoAlt: "Company Logo",
          name: "Acme Inc",
          tagline: "Quality products since 1995",
        },
      },
    });
    expect(result.slot).toBe("footer-config");
  });

  it("accepts a FooterConfig with columns and NavItem links", () => {
    const result = UpsertNavMenuSchema.parse({
      slot: "footer-config",
      items: {
        ...minimalFooterConfig,
        columns: [
          {
            heading: "Shop",
            items: [
              { kind: "link", label: "Products", href: "/products" },
              { kind: "link", label: "Deals", href: "/deals" },
            ],
          },
          {
            heading: "Support",
            items: [
              { kind: "link", label: "Contact", href: "/contact" },
              { kind: "pages-auto", label: "Pages" },
            ],
          },
        ],
      },
    });
    expect(result.slot).toBe("footer-config");
  });

  it("accepts a FooterConfig with social networks", () => {
    const result = UpsertNavMenuSchema.parse({
      slot: "footer-config",
      items: {
        ...minimalFooterConfig,
        socials: [
          { network: "facebook", href: "https://facebook.com/acme" },
          { network: "instagram", href: "https://instagram.com/acme" },
        ],
      },
    });
    expect(result.slot).toBe("footer-config");
  });

  it("accepts a FooterConfig with newsletter enabled", () => {
    const result = UpsertNavMenuSchema.parse({
      slot: "footer-config",
      items: {
        ...minimalFooterConfig,
        newsletter: {
          enabled: true,
          heading: "Stay Updated",
          placeholder: "your@email.com",
          buttonLabel: "Subscribe",
        },
      },
    });
    expect(result.slot).toBe("footer-config");
  });

  it("accepts a FooterConfig with legal links and copyright", () => {
    const result = UpsertNavMenuSchema.parse({
      slot: "footer-config",
      items: {
        ...minimalFooterConfig,
        legal: {
          copyrightText: "All rights reserved",
          showYear: true,
          links: [
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
          ],
        },
      },
    });
    expect(result.slot).toBe("footer-config");
  });

  it("rejects invalid layout value", () => {
    expect(() =>
      UpsertNavMenuSchema.parse({
        slot: "footer-config",
        items: { ...minimalFooterConfig, layout: "invalid" },
      }),
    ).toThrow();
  });

  it("rejects invalid social network", () => {
    expect(() =>
      UpsertNavMenuSchema.parse({
        slot: "footer-config",
        items: {
          ...minimalFooterConfig,
          socials: [{ network: "myspace", href: "https://myspace.com" }],
        },
      }),
    ).toThrow();
  });

  it("rejects extra fields in FooterConfig (strict mode)", () => {
    expect(() =>
      UpsertNavMenuSchema.parse({
        slot: "footer-config",
        items: { ...minimalFooterConfig, extra: true },
      }),
    ).toThrow();
  });
});
