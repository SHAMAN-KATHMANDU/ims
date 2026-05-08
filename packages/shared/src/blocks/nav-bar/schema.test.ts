import { describe, it, expect } from "vitest";
import { NavBarSchema, type NavBarProps } from "./schema";

describe("NavBarSchema", () => {
  describe("backwards compatibility — simple nav-bar (legacy)", () => {
    it("validates brand as a simple string", () => {
      const input: NavBarProps = {
        brand: "Acme Inc",
        items: [
          { label: "Home", href: "/" },
          { label: "Shop", href: "/products" },
        ],
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("validates flat items without children or mega-menu", () => {
      const input: NavBarProps = {
        brand: "Store",
        items: [
          { label: "Link 1", href: "/page1" },
          { label: "Link 2", href: "/page2" },
        ],
        showCart: true,
        showSearch: false,
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("validates with brandHref, brandStyle, sticky, align", () => {
      const input: NavBarProps = {
        brand: "Brand",
        brandHref: "/",
        brandStyle: "serif",
        sticky: true,
        align: "between",
        showAccount: true,
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });
  });

  describe("brand enrichment — object shape", () => {
    it("accepts brand as object with text + logoAssetId", () => {
      const input: NavBarProps = {
        brand: {
          text: "My Brand",
          logoAssetId: "550e8400-e29b-41d4-a716-446655440000",
        },
        items: [],
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("accepts brand as object with all optional fields", () => {
      const input: NavBarProps = {
        brand: {
          text: "Brand Name",
          logoAssetId: "550e8400-e29b-41d4-a716-446655440000",
          href: "/home",
          style: "sans",
        },
        items: [],
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("accepts brand object with only logoAssetId", () => {
      const input: NavBarProps = {
        brand: {
          logoAssetId: "550e8400-e29b-41d4-a716-446655440000",
        },
        items: [],
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("rejects brand object with invalid UUID", () => {
      const input = {
        brand: {
          text: "Brand",
          logoAssetId: "not-a-uuid",
        },
      };
      expect(() => NavBarSchema.parse(input)).toThrow();
    });
  });

  describe("recursive nav items — children (dropdowns)", () => {
    it("validates items with children", () => {
      const input: NavBarProps = {
        brand: "Store",
        items: [
          {
            label: "Products",
            href: "/products",
            children: [
              { label: "Clothing", href: "/products/clothing" },
              { label: "Accessories", href: "/products/accessories" },
            ],
          },
        ],
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("validates deeply nested children (3+ levels)", () => {
      const input: NavBarProps = {
        brand: "Store",
        items: [
          {
            label: "Level 1",
            href: "/l1",
            children: [
              {
                label: "Level 2",
                href: "/l2",
                children: [
                  {
                    label: "Level 3",
                    href: "/l3",
                    children: [{ label: "Level 4", href: "/l4" }],
                  },
                ],
              },
            ],
          },
        ],
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("validates mixed flat and nested items", () => {
      const input: NavBarProps = {
        brand: "Store",
        items: [
          { label: "Home", href: "/" },
          {
            label: "Shop",
            href: "/shop",
            children: [
              { label: "New", href: "/new" },
              { label: "Sale", href: "/sale" },
            ],
          },
          { label: "About", href: "/about" },
        ],
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });
  });

  describe("mega-menu blocks", () => {
    it("accepts items with megaMenuBlocks", () => {
      const input: NavBarProps = {
        brand: "Store",
        items: [
          {
            label: "Mega Menu",
            href: "/products",
            megaMenuBlocks: [
              { id: "mm-1", kind: "section", props: {} },
              { id: "mm-2", kind: "hero", props: { title: "Featured" } },
            ],
          },
        ],
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("accepts both children and megaMenuBlocks on the same item", () => {
      const input: NavBarProps = {
        brand: "Store",
        items: [
          {
            label: "Combined",
            href: "/shop",
            children: [{ label: "Sub", href: "/sub" }],
            megaMenuBlocks: [{ id: "mm-1", kind: "hero", props: {} }],
          },
        ],
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });
  });

  describe("CTA (Call-to-Action)", () => {
    it("accepts cta with label, href, style", () => {
      const input: NavBarProps = {
        brand: "Store",
        items: [{ label: "Home", href: "/" }],
        cta: {
          label: "Sign Up",
          href: "/signup",
          style: "primary",
        },
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("validates cta style enum", () => {
      const input: NavBarProps = {
        brand: "Store",
        cta: {
          label: "Button",
          href: "/action",
          style: "ghost",
        },
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();

      const invalid = {
        brand: "Store",
        cta: {
          label: "Button",
          href: "/action",
          style: "invalid-style",
        },
      };
      expect(() => NavBarSchema.parse(invalid)).toThrow();
    });
  });

  describe("utility bar", () => {
    it("accepts utilityBar with announcement and items", () => {
      const input: NavBarProps = {
        brand: "Store",
        utilityBar: {
          announcement: "Free shipping on orders over $50",
          items: [
            { label: "Track Order", href: "/track" },
            { label: "Help", href: "/help" },
          ],
        },
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("accepts utilityBar with only announcement", () => {
      const input: NavBarProps = {
        brand: "Store",
        utilityBar: {
          announcement: "🎉 Summer sale now live",
        },
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("accepts utilityBar with only items", () => {
      const input: NavBarProps = {
        brand: "Store",
        utilityBar: {
          items: [
            { label: "Account", href: "/account" },
            { label: "Sign Out", href: "/logout" },
          ],
        },
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("utility bar items can have children", () => {
      const input: NavBarProps = {
        brand: "Store",
        utilityBar: {
          items: [
            {
              label: "Services",
              href: "/services",
              children: [{ label: "Consulting", href: "/consulting" }],
            },
          ],
        },
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });
  });

  describe("mobile drawer", () => {
    it("accepts mobileDrawer with items", () => {
      const input: NavBarProps = {
        brand: "Store",
        mobileDrawer: {
          items: [
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
          ],
        },
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("accepts mobileDrawer with showSearch and showAccount", () => {
      const input: NavBarProps = {
        brand: "Store",
        mobileDrawer: {
          items: [{ label: "Home", href: "/" }],
          showSearch: true,
          showAccount: true,
        },
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("accepts empty mobileDrawer", () => {
      const input: NavBarProps = {
        brand: "Store",
        mobileDrawer: {},
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });

    it("mobile drawer items can have children", () => {
      const input: NavBarProps = {
        brand: "Store",
        mobileDrawer: {
          items: [
            {
              label: "Products",
              href: "/products",
              children: [{ label: "New", href: "/new" }],
            },
          ],
        },
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });
  });

  describe("comprehensive enriched example", () => {
    it("validates a fully enriched nav-bar with all optional fields", () => {
      const input: NavBarProps = {
        brand: {
          text: "Acme Co",
          logoAssetId: "550e8400-e29b-41d4-a716-446655440000",
          href: "/",
          style: "serif",
        },
        items: [
          { label: "Home", href: "/" },
          {
            label: "Products",
            href: "/products",
            children: [
              { label: "New Arrivals", href: "/new" },
              {
                label: "Collections",
                href: "/collections",
                children: [
                  { label: "Spring", href: "/spring" },
                  { label: "Summer", href: "/summer" },
                ],
              },
            ],
          },
          {
            label: "Mega Shop",
            href: "/shop",
            megaMenuBlocks: [
              { id: "mm-1", kind: "hero", props: { title: "Featured" } },
            ],
          },
        ],
        cta: {
          label: "Shop Now",
          href: "/products",
          style: "primary",
        },
        utilityBar: {
          announcement: "Free shipping on orders $50+",
          items: [
            { label: "Track", href: "/track" },
            { label: "Support", href: "/support" },
          ],
        },
        mobileDrawer: {
          items: [
            { label: "Home", href: "/" },
            { label: "Products", href: "/products", children: [] },
          ],
          showSearch: true,
          showAccount: true,
        },
        showCart: true,
        showSearch: true,
        showAccount: true,
        sticky: true,
        align: "between",
      };
      expect(() => NavBarSchema.parse(input)).not.toThrow();
    });
  });

  describe("strict validation — no unknown fields", () => {
    it("rejects unknown top-level fields", () => {
      const input = {
        brand: "Store",
        unknownField: "should fail",
      };
      expect(() => NavBarSchema.parse(input)).toThrow();
    });

    it("rejects unknown fields in nav items", () => {
      const input: NavBarProps = {
        brand: "Store",
        items: [
          {
            label: "Link",
            href: "/page",
            unknownProp: "bad",
          } as any,
        ],
      };
      expect(() => NavBarSchema.parse(input)).toThrow();
    });

    it("rejects unknown fields in cta", () => {
      const input = {
        brand: "Store",
        cta: {
          label: "Button",
          href: "/btn",
          style: "primary",
          unknownCtaProp: "bad",
        },
      };
      expect(() => NavBarSchema.parse(input)).toThrow();
    });
  });

  describe("field length constraints", () => {
    it("enforces max length on brand string", () => {
      const input: NavBarProps = {
        brand: "x".repeat(101), // 101 chars, max is 100
      };
      expect(() => NavBarSchema.parse(input)).toThrow();
    });

    it("enforces max length on item labels", () => {
      const input: NavBarProps = {
        brand: "Store",
        items: [
          {
            label: "x".repeat(101), // max 100
            href: "/page",
          },
        ],
      };
      expect(() => NavBarSchema.parse(input)).toThrow();
    });

    it("enforces max length on item hrefs", () => {
      const input: NavBarProps = {
        brand: "Store",
        items: [
          {
            label: "Link",
            href: "x".repeat(501), // max 500
          },
        ],
      };
      expect(() => NavBarSchema.parse(input)).toThrow();
    });
  });
});
