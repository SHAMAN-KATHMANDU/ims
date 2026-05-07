import { describe, it, expect } from "vitest";
import { blocksToMarkdown, blockToMarkdown } from "./serialize";
import type { BlockNode } from "../site-schema/blocks";

function block<T extends BlockNode>(b: T): BlockNode {
  return b;
}

describe("blocksToMarkdown", () => {
  it("returns empty string for empty / nullish input", () => {
    expect(blocksToMarkdown([])).toBe("");
    expect(blocksToMarkdown(undefined as unknown as BlockNode[])).toBe("");
    expect(blocksToMarkdown(null as unknown as BlockNode[])).toBe("");
  });

  it("serialises heading with level + eyebrow + subtitle", () => {
    const md = blocksToMarkdown([
      block({
        id: "h-1",
        kind: "heading",
        props: {
          text: "Title",
          level: 2,
          eyebrow: "Section",
          subtitle: "Subtitle line",
        },
      }),
    ]);
    expect(md).toBe("_Section_\n\n## Title\n\nSubtitle line");
  });

  it("clamps heading level to 1..6", () => {
    expect(
      blockToMarkdown({
        kind: "heading",
        props: { text: "X", level: 9 },
      }),
    ).toBe("###### X");
    expect(
      blockToMarkdown({
        kind: "heading",
        props: { text: "X", level: -1 },
      }),
    ).toBe("# X");
  });

  it("serialises rich-text passthrough", () => {
    expect(
      blocksToMarkdown([
        block({
          id: "rt-1",
          kind: "rich-text",
          props: { source: "Some **bold** text" },
        }),
      ]),
    ).toBe("Some **bold** text");
  });

  it("serialises images with caption", () => {
    expect(
      blocksToMarkdown([
        block({
          id: "img-1",
          kind: "image",
          props: { src: "/x.jpg", alt: "Alt", caption: "Caption" },
        }),
      ]),
    ).toBe("![Alt](/x.jpg)\n\n_Caption_");
  });

  it("emits --- for divider", () => {
    expect(
      blocksToMarkdown([block({ id: "d-1", kind: "divider", props: {} })]),
    ).toBe("---");
  });

  it("serialises accordion as ## heading + ### per item", () => {
    const md = blocksToMarkdown([
      block({
        id: "a-1",
        kind: "accordion",
        props: {
          heading: "Care",
          items: [
            { title: "Light", body: "Bright indirect" },
            { title: "Water", body: "Twice a week" },
          ],
        },
      }),
    ]);
    expect(md).toBe(
      "## Care\n\n### Light\n\nBright indirect\n\n### Water\n\nTwice a week",
    );
  });

  it("serialises testimonials as blockquotes with attribution", () => {
    expect(
      blocksToMarkdown([
        block({
          id: "t-1",
          kind: "testimonials",
          props: {
            heading: "Reviews",
            items: [
              { quote: "Great", author: "Anya" },
              { quote: "Loved it", author: "" },
            ],
          },
        }),
      ]),
    ).toBe("## Reviews\n\n> Great — Anya\n\n> Loved it");
  });

  it("recurses into containers", () => {
    expect(
      blocksToMarkdown([
        block({
          id: "sec-1",
          kind: "section",
          props: {},
          children: [
            block({
              id: "h-1",
              kind: "heading",
              props: { text: "Inside", level: 2 },
            }),
            block({
              id: "rt-1",
              kind: "rich-text",
              props: { source: "Body copy" },
            }),
          ],
        }),
      ]),
    ).toBe("## Inside\n\nBody copy");
  });

  it("ignores unknown / non-text kinds and emits nothing", () => {
    expect(
      blocksToMarkdown([
        block({
          id: "p-1",
          kind: "product-grid" as BlockNode["kind"],
          props: {
            source: "featured",
            limit: 4,
            columns: 4,
            cardVariant: "bordered",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        }),
      ]),
    ).toBe("");
  });

  it("joins multiple top-level blocks with blank lines", () => {
    expect(
      blocksToMarkdown([
        block({
          id: "h-1",
          kind: "heading",
          props: { text: "A", level: 1 },
        }),
        block({
          id: "rt-1",
          kind: "rich-text",
          props: { source: "Para" },
        }),
      ]),
    ).toBe("# A\n\nPara");
  });

  it("skips empty headings and richtext", () => {
    expect(
      blocksToMarkdown([
        block({
          id: "h-1",
          kind: "heading",
          props: { text: "  ", level: 2 },
        }),
        block({
          id: "rt-1",
          kind: "rich-text",
          props: { source: "Real text" },
        }),
      ]),
    ).toBe("Real text");
  });

  it("handles button with and without href", () => {
    expect(
      blockToMarkdown({
        kind: "button",
        props: { label: "Buy", href: "/products" },
      }),
    ).toBe("[Buy](/products)");
    expect(
      blockToMarkdown({
        kind: "button",
        props: { label: "Buy" },
      }),
    ).toBe("Buy");
  });
});
