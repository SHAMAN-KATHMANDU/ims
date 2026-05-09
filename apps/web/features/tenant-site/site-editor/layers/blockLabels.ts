import type { BlockNode, BlockKind } from "@repo/shared";

type BlockProps = Record<string, unknown>;

export function getBlockLabel(block: BlockNode): string {
  const props = block.props as BlockProps;
  switch (block.kind) {
    case "heading": {
      const level = (props.level as number | undefined) || 2;
      const text = (props.text as string | undefined) || "Heading";
      return `H${level} · ${text.slice(0, 30)}`;
    }
    case "rich-text": {
      const text = (props.text as string | undefined) || "Rich text";
      return text.slice(0, 40);
    }
    case "image": {
      const alt = (props.alt as string | undefined) || "Image";
      return `Image · ${alt.slice(0, 24)}`;
    }
    case "button": {
      const label = (props.label as string | undefined) || "Button";
      return `Button · ${label.slice(0, 20)}`;
    }
    case "section":
      return "Section";
    case "row":
      return "Row";
    case "columns": {
      const cols = (props.columns as number | undefined) || 2;
      return `${cols}-column layout`;
    }
    case "css-grid":
      return "CSS Grid";
    case "divider":
      return "Divider";
    case "spacer":
      return "Spacer";
    case "video":
      return "Video";
    case "gallery":
      return "Gallery";
    case "embed":
      return "Custom embed";
    case "accordion":
      return "Accordion";
    case "tabs":
      return "Tabs";
    case "custom-html":
      return "Custom HTML";
    case "empty-state":
      return "Empty state";
    case "markdown-body":
      return "Markdown";
    case "hero":
      return "Hero";
    case "product-grid":
      return "Product grid";
    case "category-tiles":
      return "Category tiles";
    case "product-listing":
      return "Product listing";
    case "product-filters":
      return "Product filters";
    case "bundle-spotlight":
      return "Bundle spotlight";
    case "gift-card-redeem":
      return "Gift card redeem";
    case "collection-cards":
      return "Collection cards";
    case "announcement-bar":
      return "Announcement bar";
    case "trust-strip":
      return "Trust strip";
    case "story-split":
      return "Story split";
    case "bento-showcase":
      return "Bento showcase";
    case "stats-band":
      return "Stats band";
    case "newsletter":
      return "Newsletter";
    case "contact-block":
      return "Contact block";
    case "faq":
      return "FAQ";
    case "testimonials":
      return "Testimonials";
    case "logo-cloud":
      return "Logo cloud";
    case "form":
      return "Form";
    case "policy-strip":
      return "Policy strip";
    case "blog-list":
      return "Blog list";
    case "pdp-gallery":
      return "Product gallery";
    case "pdp-buybox":
      return "Product buybox";
    case "pdp-related":
      return "Related products";
    case "pdp-details":
      return "Product details";
    case "reviews-list":
      return "Product reviews";
    case "nav-bar":
      return "Navigation";
    case "logo-mark":
      return "Logo mark";
    case "utility-bar":
      return "Utility bar";
    case "footer-columns":
      return "Footer";
    case "social-links":
      return "Social links";
    case "payment-icons":
      return "Payment icons";
    case "copyright-bar":
      return "Copyright bar";
    case "breadcrumbs":
      return "Breadcrumbs";
    case "product-comparison":
      return "Product comparison";
    case "lookbook":
      return "Lookbook";
    case "size-guide":
      return "Size guide";
    case "recently-viewed":
      return "Recently viewed";
    case "fbt":
      return "FBT";
    case "cart-line-items":
      return "Cart items";
    case "order-summary":
      return "Order summary";
    case "account-bar":
      return "Account bar";
    case "price-tiers":
      return "Price tiers";
    case "snippet-ref":
      return "Snippet";
    default:
      return `Block (${block.kind})`;
  }
}

export function getBlockIcon(kind: BlockKind): string {
  const iconMap: Partial<Record<BlockKind, string>> = {
    heading: "type",
    "rich-text": "type",
    image: "image",
    button: "click",
    section: "layout",
    row: "layout",
    columns: "layout",
    "css-grid": "layout",
    divider: "minus",
    spacer: "arrow-up-down",
    video: "video",
    gallery: "images",
    embed: "code",
    accordion: "list",
    tabs: "list",
    "custom-html": "code",
    "empty-state": "inbox",
    "markdown-body": "file-text",
    hero: "layout",
    "product-grid": "store",
    "category-tiles": "store",
    "product-listing": "store",
    "product-filters": "filter",
    "bundle-spotlight": "box",
    "gift-card-redeem": "gift",
    "collection-cards": "layers",
    "announcement-bar": "bell",
    "trust-strip": "shield",
    "story-split": "split",
    "bento-showcase": "grid",
    "stats-band": "bar-chart-2",
    newsletter: "mail",
    "contact-block": "mail",
    faq: "help-circle",
    testimonials: "quote",
    "logo-cloud": "star",
    form: "form",
    "policy-strip": "file-text",
    "blog-list": "list",
    "pdp-gallery": "image",
    "pdp-buybox": "shopping-cart",
    "pdp-related": "package",
    "pdp-details": "info",
    "reviews-list": "star",
    "nav-bar": "menu",
    "logo-mark": "circle",
    "utility-bar": "menu",
    "footer-columns": "layout",
    "social-links": "link",
    "payment-icons": "credit-card",
    "copyright-bar": "file-text",
    breadcrumbs: "chevrons-right",
    "product-comparison": "columns",
    lookbook: "image",
    "size-guide": "ruler",
    "recently-viewed": "history",
    fbt: "code",
    "cart-line-items": "shopping-cart",
    "order-summary": "receipt",
    "account-bar": "user",
    "price-tiers": "layers",
    "snippet-ref": "code",
  };

  return iconMap[kind] || "box";
}
