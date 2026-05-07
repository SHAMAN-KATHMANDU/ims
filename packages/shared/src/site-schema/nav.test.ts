import { describe, it, expect } from "vitest";
import {
  NavConfigSchema,
  NavItemSchema,
  NavItemsSchema,
  defaultHeaderNavConfig,
  type NavItem,
} from "./nav";

describe("NavItem schema", () => {
  it("validates a link item", () => {
    const item: NavItem = {
      kind: "link",
      label: "Home",
      href: "/",
    };
    const result = NavItemSchema.safeParse(item);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("link");
    }
  });

  it("validates a link item with openInNewTab", () => {
    const item: NavItem = {
      kind: "link",
      label: "External",
      href: "https://example.com",
      openInNewTab: true,
    };
    const result = NavItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it("validates a CTA item", () => {
    const item: NavItem = {
      kind: "cta",
      label: "Shop now",
      href: "/products",
      style: "primary",
    };
    const result = NavItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it("validates a dropdown with nested links", () => {
    const item: NavItem = {
      kind: "dropdown",
      label: "Company",
      items: [
        { kind: "link", label: "About", href: "/about" },
        { kind: "link", label: "Careers", href: "/careers" },
      ],
    };
    const result = NavItemSchema.safeParse(item);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("dropdown");
      expect(result.data.items).toHaveLength(2);
    }
  });

  it("validates a mega-column with multiple columns", () => {
    const item: NavItem = {
      kind: "mega-column",
      label: "Products",
      columns: [
        {
          heading: "Apparel",
          items: [
            { kind: "link", label: "Shirts", href: "/shirts" },
            { kind: "link", label: "Pants", href: "/pants" },
          ],
        },
        {
          heading: "Accessories",
          items: [{ kind: "link", label: "Bags", href: "/bags" }],
        },
      ],
    };
    const result = NavItemSchema.safeParse(item);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.kind).toBe("mega-column");
      expect(result.data.columns).toHaveLength(2);
    }
  });

  it("validates a mega-column with featured section", () => {
    const item: NavItem = {
      kind: "mega-column",
      label: "Collections",
      columns: [
        {
          heading: "Featured",
          items: [
            { kind: "link", label: "New arrivals", href: "/new" },
            { kind: "link", label: "Best sellers", href: "/bestsellers" },
          ],
        },
      ],
      featured: {
        imageUrl: "https://example.com/featured.jpg",
        heading: "Summer Sale",
        subtitle: "Up to 50% off",
        ctaLabel: "Shop now",
        href: "/summer-sale",
      },
    };
    const result = NavItemSchema.safeParse(item);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.featured).toBeDefined();
      expect(result.data.featured?.heading).toBe("Summer Sale");
    }
  });

  it("validates pages-auto item", () => {
    const item: NavItem = {
      kind: "pages-auto",
      label: "Pages",
    };
    const result = NavItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it("rejects extra unknown properties", () => {
    const item = {
      kind: "link",
      label: "Home",
      href: "/",
      unknown: "property",
    };
    const result = NavItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const item = {
      kind: "link",
      label: "Home",
      // missing href
    };
    const result = NavItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it("validates nested dropdown in dropdown", () => {
    const item: NavItem = {
      kind: "dropdown",
      label: "Support",
      items: [
        { kind: "link", label: "FAQ", href: "/faq" },
        {
          kind: "dropdown",
          label: "Contact",
          items: [
            {
              kind: "link",
              label: "Email",
              href: "mailto:support@example.com",
            },
            { kind: "link", label: "Phone", href: "tel:+1234567890" },
          ],
        },
      ],
    };
    const result = NavItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it("enforces max 50 items in dropdown", () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      kind: "link" as const,
      label: `Item ${i}`,
      href: `/item-${i}`,
    }));
    const item: NavItem = {
      kind: "dropdown",
      label: "Long list",
      items,
    };
    const result = NavItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it("enforces max 6 columns in mega-column", () => {
    const columns = Array.from({ length: 7 }, (_, i) => ({
      heading: `Column ${i}`,
      items: [{ kind: "link" as const, label: `Item`, href: "/" }],
    }));
    const item: NavItem = {
      kind: "mega-column",
      label: "Too many columns",
      columns,
    };
    const result = NavItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });
});

describe("NavItemsSchema", () => {
  it("validates an array of items", () => {
    const items: NavItem[] = [
      { kind: "link", label: "Home", href: "/" },
      { kind: "link", label: "Shop", href: "/products" },
    ];
    const result = NavItemsSchema.safeParse(items);
    expect(result.success).toBe(true);
  });

  it("enforces max 100 items total", () => {
    const items = Array.from({ length: 101 }, (_, i) => ({
      kind: "link" as const,
      label: `Item ${i}`,
      href: `/item-${i}`,
    }));
    const result = NavItemsSchema.safeParse(items);
    expect(result.success).toBe(false);
  });
});

describe("NavConfig schema", () => {
  it("validates a default nav config", () => {
    const config = defaultHeaderNavConfig();
    const result = NavConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("validates nav config with logo", () => {
    const config = {
      layout: "standard" as const,
      behavior: "sticky" as const,
      items: [{ kind: "link" as const, label: "Home", href: "/" }],
      logo: {
        url: "https://example.com/logo.svg",
        alt: "Company logo",
      },
      mobile: {
        drawerStyle: "slide-right" as const,
        showSearch: false,
      },
      showCart: true,
      showSearch: false,
      showAccount: false,
    };
    const result = NavConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.logo?.url).toBe("https://example.com/logo.svg");
      expect(result.data.logo?.alt).toBe("Company logo");
    }
  });

  it("validates nav config with optional CTA", () => {
    const config = {
      layout: "standard" as const,
      behavior: "sticky" as const,
      items: [{ kind: "link" as const, label: "Home", href: "/" }],
      cta: {
        label: "Sign up",
        href: "/signup",
        style: "primary" as const,
      },
      mobile: {
        drawerStyle: "slide-right" as const,
        showSearch: true,
      },
      showCart: true,
      showSearch: true,
      showAccount: true,
    };
    const result = NavConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cta?.label).toBe("Sign up");
    }
  });

  it("validates nav config with dropdown and mega-column items", () => {
    const config = {
      layout: "standard" as const,
      behavior: "sticky" as const,
      items: [
        { kind: "link" as const, label: "Home", href: "/" },
        {
          kind: "dropdown" as const,
          label: "Company",
          items: [
            { kind: "link" as const, label: "About", href: "/about" },
            { kind: "link" as const, label: "Careers", href: "/careers" },
          ],
        },
        {
          kind: "mega-column" as const,
          label: "Products",
          columns: [
            {
              heading: "Apparel",
              items: [
                { kind: "link" as const, label: "Shirts", href: "/shirts" },
              ],
            },
          ],
        },
      ],
      mobile: {
        drawerStyle: "fullscreen" as const,
        showSearch: false,
      },
      showCart: true,
      showSearch: false,
      showAccount: false,
    };
    const result = NavConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(3);
      expect(result.data.items[1].kind).toBe("dropdown");
      expect(result.data.items[2].kind).toBe("mega-column");
    }
  });

  it("validates all layout options", () => {
    const layouts = ["standard", "centered", "split", "minimal"] as const;
    for (const layout of layouts) {
      const config = {
        layout,
        behavior: "sticky" as const,
        items: [],
        mobile: {
          drawerStyle: "slide-right" as const,
          showSearch: false,
        },
        showCart: true,
        showSearch: false,
        showAccount: false,
      };
      const result = NavConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    }
  });

  it("validates all behavior options", () => {
    const behaviors = [
      "sticky",
      "static",
      "scroll-hide",
      "transparent-on-hero",
    ] as const;
    for (const behavior of behaviors) {
      const config = {
        layout: "standard" as const,
        behavior,
        items: [],
        mobile: {
          drawerStyle: "slide-right" as const,
          showSearch: false,
        },
        showCart: true,
        showSearch: false,
        showAccount: false,
      };
      const result = NavConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    }
  });

  it("validates all drawer style options", () => {
    const styles = ["slide-left", "slide-right", "fullscreen"] as const;
    for (const style of styles) {
      const config = {
        layout: "standard" as const,
        behavior: "sticky" as const,
        items: [],
        mobile: {
          drawerStyle: style,
          showSearch: false,
        },
        showCart: true,
        showSearch: false,
        showAccount: false,
      };
      const result = NavConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    }
  });

  it("rejects extra unknown properties", () => {
    const config = {
      layout: "standard",
      behavior: "sticky",
      items: [],
      mobile: {
        drawerStyle: "slide-right",
        showSearch: false,
      },
      showCart: true,
      showSearch: false,
      showAccount: false,
      unknownField: "should fail",
    };
    const result = NavConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("requires logo.url when logo is provided", () => {
    const config = {
      layout: "standard" as const,
      behavior: "sticky" as const,
      items: [],
      logo: {
        // missing url
        alt: "Logo",
      },
      mobile: {
        drawerStyle: "slide-right" as const,
        showSearch: false,
      },
      showCart: true,
      showSearch: false,
      showAccount: false,
    };
    const result = NavConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
