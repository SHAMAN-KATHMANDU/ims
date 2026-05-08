import { describe, it, expect } from "vitest";
import {
  synthesizeHeaderBlocks,
  synthesizeFooterBlocks,
  type ChromeSynthesisInput,
} from "./synthesize-chrome-layout";
import { BlockTreeSchema } from "@repo/shared";
import type {
  NavConfig,
  FooterConfig,
  NavItem,
  BlockNode,
  NavBarProps,
  FooterColumnsProps,
} from "@repo/shared";

describe("synthesizeHeaderBlocks", () => {
  const defaultNavConfig: NavConfig = {
    layout: "standard",
    behavior: "sticky",
    items: [
      { kind: "link", label: "Home", href: "/" },
      { kind: "link", label: "Shop", href: "/products" },
    ],
    mobile: {
      drawerStyle: "slide-right",
      showSearch: false,
    },
    showCart: true,
    showSearch: false,
    showAccount: false,
  };

  it("synth from navConfig only (no fallback)", () => {
    const input: ChromeSynthesisInput = {
      navConfig: defaultNavConfig,
    };

    const result = synthesizeHeaderBlocks(input);

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("nav-bar");
    const navBarProps = result[0]?.props as NavBarProps | undefined;
    expect(navBarProps).toMatchObject({
      sticky: true,
      showCart: true,
      showSearch: false,
    });

    // Validate against schema
    const validation = BlockTreeSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  it("synth from fallback only (no navConfig)", () => {
    const fallback: BlockNode[] = [
      {
        id: "fallback-1",
        kind: "section" as const,
        props: { background: "default" },
      } as unknown as BlockNode,
    ];

    const input: ChromeSynthesisInput = {
      templateHeaderFallback: fallback,
    };

    const result = synthesizeHeaderBlocks(input);

    expect(result).toEqual(fallback);
  });

  it("empty arrays when no input provided", () => {
    const input: ChromeSynthesisInput = {};

    const result = synthesizeHeaderBlocks(input);

    expect(result).toEqual([]);
  });

  it("navConfig takes precedence over fallback", () => {
    const fallback: BlockNode[] = [
      {
        id: "fallback-1",
        kind: "section" as const,
        props: { background: "default" },
      } as unknown as BlockNode,
    ];

    const input: ChromeSynthesisInput = {
      navConfig: defaultNavConfig,
      templateHeaderFallback: fallback,
    };

    const result = synthesizeHeaderBlocks(input);

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("nav-bar");
  });

  it("maps sticky behavior from navConfig", () => {
    const navConfig: NavConfig = {
      ...defaultNavConfig,
      behavior: "static",
    };

    const input: ChromeSynthesisInput = { navConfig };
    const result = synthesizeHeaderBlocks(input);

    expect(result[0]?.props.sticky).toBe(false);
  });

  it("includes CTA when present", () => {
    const navConfig: NavConfig = {
      ...defaultNavConfig,
      cta: {
        label: "Buy Now",
        href: "/shop",
        style: "primary",
      },
    };

    const input: ChromeSynthesisInput = { navConfig };
    const result = synthesizeHeaderBlocks(input);

    const navBarProps = result[0]?.props as NavBarProps | undefined;
    expect(navBarProps?.cta).toEqual({
      label: "Buy Now",
      href: "/shop",
      style: "primary",
    });
  });

  it("includes mobile drawer when present", () => {
    const navConfig: NavConfig = {
      ...defaultNavConfig,
    };

    const mobileDrawerConfig: NavConfig = {
      layout: "standard",
      behavior: "static",
      items: [
        { kind: "link", label: "Account", href: "/account" },
        { kind: "link", label: "Help", href: "/help" },
      ],
      mobile: {
        drawerStyle: "slide-right",
        showSearch: true,
      },
      showCart: false,
      showSearch: true,
      showAccount: true,
    };

    const input: ChromeSynthesisInput = {
      navConfig,
      mobileDrawerConfig,
    };

    const result = synthesizeHeaderBlocks(input);

    const navBarProps = result[0]?.props as NavBarProps | undefined;
    expect(navBarProps?.mobileDrawer).toBeDefined();
    expect(navBarProps?.mobileDrawer?.items).toHaveLength(2);
    expect(navBarProps?.mobileDrawer?.showSearch).toBe(true);
  });

  it("uses footerConfig brand name as nav brand", () => {
    const footerConfig: FooterConfig = {
      layout: "columns",
      background: "muted",
      brand: {
        name: "Acme Corp",
        tagline: "Quality goods",
      },
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

    const input: ChromeSynthesisInput = {
      navConfig: defaultNavConfig,
      footerConfig,
    };

    const result = synthesizeHeaderBlocks(input);

    const navBarProps = result[0]?.props as NavBarProps | undefined;
    expect(navBarProps?.brand).toBe("Acme Corp");
  });

  it("recursively converts nested nav items", () => {
    const navConfig: NavConfig = {
      ...defaultNavConfig,
      items: [
        { kind: "link", label: "Home", href: "/" },
        {
          kind: "dropdown",
          label: "Products",
          items: [
            { kind: "link", label: "Category A", href: "/cat-a" },
            { kind: "link", label: "Category B", href: "/cat-b" },
          ],
        },
      ],
    };

    const input: ChromeSynthesisInput = { navConfig };
    const result = synthesizeHeaderBlocks(input);

    const navBarProps = result[0]?.props as NavBarProps | undefined;
    const items = navBarProps?.items;
    expect(items).toHaveLength(2);
    expect(items?.[1]).toMatchObject({
      label: "Products",
      children: expect.arrayContaining([
        expect.objectContaining({ label: "Category A" }),
        expect.objectContaining({ label: "Category B" }),
      ]),
    });

    // Validate against schema
    const validation = BlockTreeSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  it("validates navConfig schema and throws on invalid input", () => {
    const invalidNavConfig = {
      layout: "standard",
      behavior: "sticky",
      items: [],
      // missing required fields
    } as any;

    const input: ChromeSynthesisInput = {
      navConfig: invalidNavConfig,
    };

    expect(() => synthesizeHeaderBlocks(input)).toThrow();
  });
});

describe("synthesizeFooterBlocks", () => {
  const defaultFooterConfig: FooterConfig = {
    layout: "columns",
    background: "muted",
    brand: {
      name: "Acme Shop",
      tagline: "Quality products",
    },
    columns: [
      {
        heading: "Shop",
        items: [
          { kind: "link", label: "All Products", href: "/products" },
          { kind: "link", label: "New Arrivals", href: "/new" },
        ],
      },
      {
        heading: "Company",
        items: [
          { kind: "link", label: "About", href: "/about" },
          { kind: "link", label: "Contact", href: "/contact" },
        ],
      },
    ],
    socials: [
      { network: "facebook", href: "https://facebook.com/acme" },
      { network: "instagram", href: "https://instagram.com/acme" },
    ],
    newsletter: {
      enabled: true,
      heading: "Stay updated",
    },
    legal: {
      showYear: true,
      copyrightText: "All rights reserved",
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  };

  it("synth from footerConfig (full)", () => {
    const input: ChromeSynthesisInput = {
      footerConfig: defaultFooterConfig,
    };

    const result = synthesizeFooterBlocks(input);

    expect(result.length).toBeGreaterThan(0);

    // Should have footer-columns block
    const footerBlock = result.find((b) => b.kind === "footer-columns");
    expect(footerBlock).toBeDefined();
    const footerProps = footerBlock?.props as FooterColumnsProps | undefined;
    expect(footerProps).toMatchObject({
      brand: "Acme Shop",
      tagline: "Quality products",
    });

    // Should have social-links block
    const socialBlock = result.find((b) => b.kind === "social-links");
    expect(socialBlock).toBeDefined();
    expect((socialBlock?.props as any)?.items).toHaveLength(2);

    // Should have copyright-bar block
    const copyrightBlock = result.find((b) => b.kind === "copyright-bar");
    expect(copyrightBlock).toBeDefined();

    // Validate all blocks against schema
    const validation = BlockTreeSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  it("synth from legacy footer-1 and footer-2 items", () => {
    const footerPrimaryItems: NavItem[] = [
      { kind: "link", label: "All Products", href: "/products" },
      { kind: "link", label: "New Arrivals", href: "/new" },
    ];

    const footerSecondaryItems: NavItem[] = [
      { kind: "link", label: "About", href: "/about" },
      { kind: "link", label: "Contact", href: "/contact" },
    ];

    const input: ChromeSynthesisInput = {
      footerPrimaryItems,
      footerSecondaryItems,
    };

    const result = synthesizeFooterBlocks(input);

    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("footer-columns");
    const footerProps = result[0]?.props as FooterColumnsProps | undefined;
    expect(footerProps?.columns).toHaveLength(2);
  });

  it("synth from fallback only (no footerConfig)", () => {
    const fallback: BlockNode[] = [
      {
        id: "fallback-1",
        kind: "section" as const,
        props: { background: "default" },
      } as unknown as BlockNode,
    ];

    const input: ChromeSynthesisInput = {
      templateFooterFallback: fallback,
    };

    const result = synthesizeFooterBlocks(input);

    expect(result).toEqual(fallback);
  });

  it("footerConfig takes precedence over legacy items", () => {
    const input: ChromeSynthesisInput = {
      footerConfig: defaultFooterConfig,
      footerPrimaryItems: [
        { kind: "link", label: "Legacy", href: "/legacy" },
      ],
    };

    const result = synthesizeFooterBlocks(input);

    const footerBlock = result.find((b) => b.kind === "footer-columns");
    const footerProps = footerBlock?.props as FooterColumnsProps | undefined;
    expect(footerProps?.columns).toHaveLength(2); // from footerConfig, not legacy
  });

  it("empty arrays when no input provided", () => {
    const input: ChromeSynthesisInput = {};

    const result = synthesizeFooterBlocks(input);

    expect(result).toEqual([]);
  });

  it("handles footerConfig with minimal data", () => {
    const minimalConfig: FooterConfig = {
      layout: "columns",
      background: "default",
      brand: {},
      columns: [
        {
          heading: "Links",
          items: [{ kind: "link", label: "Home", href: "/" }],
        },
      ],
      socials: [],
      newsletter: { enabled: false },
      legal: { showYear: false, links: [] },
    };

    const input: ChromeSynthesisInput = {
      footerConfig: minimalConfig,
    };

    const result = synthesizeFooterBlocks(input);

    // Should only have footer-columns (no socials, no copyright because legal is empty)
    expect(result).toHaveLength(1);
    expect(result[0]?.kind).toBe("footer-columns");

    const validation = BlockTreeSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  it("excludes dropdowns and non-link items from footer columns", () => {
    const footerConfig: FooterConfig = {
      ...defaultFooterConfig,
      columns: [
        {
          heading: "Shop",
          items: [
            { kind: "link", label: "Products", href: "/products" },
            {
              kind: "dropdown",
              label: "Categories",
              items: [
                { kind: "link", label: "Cat A", href: "/a" },
              ],
            },
          ],
        },
      ],
    };

    const input: ChromeSynthesisInput = { footerConfig };
    const result = synthesizeFooterBlocks(input);

    const footerBlock = result.find((b) => b.kind === "footer-columns");
    const footerProps = footerBlock?.props as FooterColumnsProps | undefined;
    const links = footerProps?.columns?.[0]?.links;
    expect(links).toHaveLength(1); // only the link, not the dropdown
    expect(links?.[0]?.label).toBe("Products");
  });

  it("validates footerConfig schema and throws on invalid input", () => {
    const invalidFooterConfig = {
      layout: "invalid",
      // missing many required fields
    } as any;

    const input: ChromeSynthesisInput = {
      footerConfig: invalidFooterConfig,
    };

    expect(() => synthesizeFooterBlocks(input)).toThrow();
  });
});

describe("Integration: both header and footer synthesis", () => {
  it("synthesizes complete chrome from both inputs", () => {
    const navConfig: NavConfig = {
      layout: "standard",
      behavior: "sticky",
      items: [{ kind: "link", label: "Home", href: "/" }],
      mobile: { drawerStyle: "slide-right", showSearch: false },
      showCart: true,
      showSearch: false,
      showAccount: false,
    };

    const footerConfig: FooterConfig = {
      layout: "columns",
      background: "muted",
      brand: { name: "Brand" },
      columns: [
        { heading: "Shop", items: [{ kind: "link", label: "All", href: "/" }] },
      ],
      socials: [],
      newsletter: { enabled: false },
      legal: { showYear: true, links: [] },
    };

    const headerBlocks = synthesizeHeaderBlocks({ navConfig });
    const footerBlocks = synthesizeFooterBlocks({ footerConfig });

    expect(headerBlocks).toHaveLength(1);
    expect(footerBlocks).toHaveLength(1);

    // Both should validate
    const headerValidation = BlockTreeSchema.safeParse(headerBlocks);
    const footerValidation = BlockTreeSchema.safeParse(footerBlocks);
    expect(headerValidation.success).toBe(true);
    expect(footerValidation.success).toBe(true);
  });
});
