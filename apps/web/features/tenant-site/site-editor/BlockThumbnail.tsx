"use client";

/**
 * BlockThumbnail — mini CSS-only preview chip shown in the block palette.
 * Pure presentational: no hooks, no store access.
 */

import {
  Rows3,
  AlignLeft,
  Image,
  MousePointerClick,
  Sparkles,
  LayoutGrid,
  Sliders,
  Megaphone,
  ShieldCheck,
  Columns2,
  LayoutDashboard,
  BarChart3,
  Mail,
  HelpCircle,
  Quote,
  Images,
  ShoppingCart,
  Info,
  Layers,
  ChevronsRight,
  Code2,
  Play,
  ListTree,
  PanelTopOpen,
  ClipboardList,
  Code,
  Package,
  Gift,
  Star,
  ShoppingBag,
  Ruler,
  FileCheck,
  Menu,
  Tag,
  Share2,
  CreditCard,
  CircleSlash,
  Heading,
  Columns3,
  Box,
  FileText,
  Contact as ContactIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Block icon map — exported so BlocksPanel / BlockActionToolbar can reuse it
// ---------------------------------------------------------------------------

export const BLOCK_ICON: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  section: Rows3,
  spacer: Rows3,
  divider: Rows3,
  heading: Heading,
  "rich-text": AlignLeft,
  image: Image,
  button: MousePointerClick,
  "markdown-body": FileText,
  hero: Sparkles,
  "product-grid": LayoutGrid,
  "category-tiles": LayoutGrid,
  "product-listing": LayoutGrid,
  "product-filters": Sliders,
  "collection-cards": LayoutGrid,
  "announcement-bar": Megaphone,
  "trust-strip": ShieldCheck,
  "story-split": Columns2,
  "bento-showcase": LayoutDashboard,
  "stats-band": BarChart3,
  newsletter: Mail,
  "contact-block": ContactIcon,
  faq: HelpCircle,
  testimonials: Quote,
  "logo-cloud": Box,
  "blog-list": FileText,
  "pdp-gallery": Images,
  "pdp-buybox": ShoppingCart,
  "pdp-details": Info,
  "pdp-related": Layers,
  breadcrumbs: ChevronsRight,
  embed: Code2,
  video: Play,
  accordion: ListTree,
  columns: Columns3,
  gallery: Images,
  tabs: PanelTopOpen,
  form: ClipboardList,
  "css-grid": LayoutGrid,
  row: Rows3,
  "custom-html": Code,
  "bundle-spotlight": Package,
  "gift-card-redeem": Gift,
  "recently-viewed": Star,
  "reviews-list": Star,
  fbt: ShoppingBag,
  "size-guide": Ruler,
  "product-comparison": Columns2,
  lookbook: Images,
  "policy-strip": FileCheck,
  "nav-bar": Menu,
  "logo-mark": Tag,
  "utility-bar": Sliders,
  "footer-columns": Columns3,
  "social-links": Share2,
  "payment-icons": CreditCard,
  "copyright-bar": CreditCard,
  "empty-state": CircleSlash,
};

export function getBlockIcon(
  kind: string,
): React.ComponentType<{ size?: number; className?: string }> {
  return BLOCK_ICON[kind] ?? Box;
}

// ---------------------------------------------------------------------------
// BlockThumbnail
// ---------------------------------------------------------------------------

export function BlockThumbnail({ kind }: { kind: string }) {
  const bar = "h-[3px] rounded-full bg-muted-foreground/40";
  const barStrong = "h-[3px] rounded-full bg-muted-foreground/60";
  const rect =
    "rounded-sm bg-muted-foreground/20 border border-muted-foreground/10";
  const rectStrong = "rounded-sm bg-muted-foreground/35";
  const pill = "rounded-full bg-primary/40";

  const shell =
    "relative w-full h-14 rounded-md bg-gradient-to-br from-muted/70 to-muted/30 border border-border overflow-hidden flex flex-col";

  switch (kind) {
    case "hero":
      return (
        <div className={shell}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
          <div className="relative flex-1 flex flex-col items-center justify-center gap-1 px-3">
            <div className={cn(barStrong, "w-10")} />
            <div className={cn(bar, "w-16")} />
            <div className={cn(pill, "w-8 h-2 mt-0.5")} />
          </div>
        </div>
      );

    case "heading":
      return (
        <div className={cn(shell, "justify-center items-center gap-1.5")}>
          <div className="h-[5px] rounded-full bg-muted-foreground/70 w-16" />
          <div className={cn(bar, "w-20")} />
        </div>
      );

    case "rich-text":
    case "markdown-body":
      return (
        <div className={cn(shell, "justify-center gap-1 px-3")}>
          <div className={cn(bar, "w-[85%]")} />
          <div className={cn(bar, "w-[70%]")} />
          <div className={cn(bar, "w-[80%]")} />
          <div className={cn(bar, "w-[55%]")} />
        </div>
      );

    case "image":
    case "video":
      return (
        <div className={shell}>
          <div className="absolute inset-1.5 rounded bg-muted-foreground/25 grid place-items-center">
            {kind === "video" ? (
              <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[8px] border-l-background ml-1" />
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-background/80"
                fill="currentColor"
              >
                <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5Z" />
              </svg>
            )}
          </div>
        </div>
      );

    case "button":
      return (
        <div className={cn(shell, "justify-center items-center")}>
          <div className="h-5 w-16 rounded-full bg-primary/70" />
        </div>
      );

    case "divider":
      return (
        <div className={cn(shell, "justify-center items-center")}>
          <div className="h-px w-[80%] bg-muted-foreground/50" />
        </div>
      );

    case "spacer":
      return (
        <div className={shell}>
          <div className="flex-1" />
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-3 rounded-sm bg-muted-foreground/10 border border-dashed border-muted-foreground/30" />
        </div>
      );

    case "product-grid":
    case "collection-cards":
      return (
        <div className={shell}>
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={cn(rect, "h-full")} />
            ))}
          </div>
        </div>
      );

    case "category-tiles":
    case "gallery":
    case "lookbook":
    case "bento-showcase":
      return (
        <div className={shell}>
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full">
            <div className={cn(rect, "row-span-2")} />
            <div className={rect} />
            <div className={rect} />
            <div className={rect} />
            <div className={rect} />
          </div>
        </div>
      );

    case "columns":
    case "story-split":
    case "product-comparison":
      return (
        <div className={shell}>
          <div className="grid grid-cols-2 gap-1 p-1.5 h-full">
            <div className={cn(rect, "h-full")} />
            <div className={cn(rect, "h-full")} />
          </div>
        </div>
      );

    case "row":
    case "section":
      return (
        <div className={shell}>
          <div className="flex gap-1 p-1.5 h-full">
            <div className={cn(rect, "flex-1")} />
            <div className={cn(rect, "flex-1")} />
            <div className={cn(rect, "flex-1")} />
          </div>
        </div>
      );

    case "css-grid":
      return (
        <div className={shell}>
          <div className="grid grid-cols-4 grid-rows-2 gap-0.5 p-1.5 h-full">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className={rect} />
            ))}
          </div>
        </div>
      );

    case "product-listing":
      return (
        <div className={shell}>
          <div className="grid grid-cols-[auto_1fr] gap-1 p-1.5 h-full">
            <div className="flex flex-col gap-1 w-5">
              <div className={cn(rect, "h-1.5")} />
              <div className={cn(rect, "h-1.5")} />
              <div className={cn(rect, "h-1.5")} />
            </div>
            <div className="grid grid-cols-3 gap-1 h-full">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={cn(rect, "h-full")} />
              ))}
            </div>
          </div>
        </div>
      );

    case "product-filters":
    case "utility-bar":
      return (
        <div className={shell}>
          <div className="flex items-center gap-1 px-2 h-full">
            <div className="h-3 w-8 rounded-sm bg-muted-foreground/30" />
            <div className="h-3 w-10 rounded-sm bg-muted-foreground/30" />
            <div className="h-3 w-6 rounded-sm bg-muted-foreground/30" />
            <div className="h-3 w-8 rounded-sm bg-muted-foreground/30" />
          </div>
        </div>
      );

    case "announcement-bar":
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <div className="w-full h-3 bg-primary/70" />
          <div className="flex-1 w-full" />
        </div>
      );

    case "trust-strip":
    case "logo-cloud":
    case "payment-icons":
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <div className="flex items-center gap-1.5 px-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-4 w-6 rounded-sm bg-muted-foreground/35"
              />
            ))}
          </div>
        </div>
      );

    case "stats-band":
      return (
        <div className={shell}>
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full items-center">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div className="h-2 w-5 rounded-sm bg-muted-foreground/60" />
                <div className="h-1 w-7 rounded-sm bg-muted-foreground/30" />
              </div>
            ))}
          </div>
        </div>
      );

    case "newsletter":
    case "contact-block":
    case "form":
      return (
        <div className={shell}>
          <div className="flex flex-col gap-1 p-2 h-full justify-center">
            <div className="h-3 rounded-sm bg-muted-foreground/15 border border-muted-foreground/25" />
            <div className="flex gap-1 items-center">
              <div className="flex-1 h-3 rounded-sm bg-muted-foreground/15 border border-muted-foreground/25" />
              <div className="h-3 w-8 rounded-sm bg-primary/70" />
            </div>
          </div>
        </div>
      );

    case "faq":
    case "accordion":
      return (
        <div className={shell}>
          <div className="flex flex-col gap-1 p-1.5 h-full">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between h-3 px-1 rounded-sm bg-muted-foreground/15 border border-muted-foreground/20"
              >
                <div className="h-1 w-8 rounded-sm bg-muted-foreground/45" />
                <div className="text-[7px] text-muted-foreground/50">＋</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "testimonials":
    case "reviews-list":
      return (
        <div className={shell}>
          <div className="flex flex-col gap-1 p-2 h-full justify-center">
            <div className="text-[10px] leading-none text-muted-foreground/50 font-serif">
              &ldquo;
            </div>
            <div className={cn(bar, "w-[85%]")} />
            <div className={cn(bar, "w-[70%]")} />
            <div className="flex gap-0.5 mt-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-1 w-1 rounded-full bg-amber-400" />
              ))}
            </div>
          </div>
        </div>
      );

    case "blog-list":
      return (
        <div className={shell}>
          <div className="grid grid-cols-3 gap-1 p-1.5 h-full">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <div className={cn(rect, "flex-1")} />
                <div className="h-1 rounded-sm bg-muted-foreground/50" />
                <div className="h-1 w-3/4 rounded-sm bg-muted-foreground/30" />
              </div>
            ))}
          </div>
        </div>
      );

    case "pdp-gallery":
      return (
        <div className={shell}>
          <div className="grid grid-cols-[auto_1fr] gap-1 p-1.5 h-full">
            <div className="flex flex-col gap-0.5 w-3">
              <div className={rectStrong + " h-2"} />
              <div className={rectStrong + " h-2"} />
              <div className={rectStrong + " h-2"} />
            </div>
            <div className={cn(rect, "h-full")} />
          </div>
        </div>
      );

    case "pdp-buybox":
      return (
        <div className={shell}>
          <div className="flex flex-col gap-1 p-2 h-full">
            <div className="h-2 w-[55%] rounded-sm bg-muted-foreground/50" />
            <div className="h-1.5 w-[35%] rounded-sm bg-muted-foreground/30" />
            <div className="flex gap-1 mt-auto">
              <div className="h-3 flex-1 rounded-sm bg-primary/70" />
              <div className="h-3 w-5 rounded-sm bg-muted-foreground/30" />
            </div>
          </div>
        </div>
      );

    case "pdp-details":
    case "pdp-related":
    case "fbt":
    case "recently-viewed":
      return (
        <div className={shell}>
          <div className="grid grid-cols-4 gap-1 p-1.5 h-full">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={cn(rect, "h-full")} />
            ))}
          </div>
        </div>
      );

    case "tabs":
      return (
        <div className={shell}>
          <div className="flex gap-0.5 px-1.5 pt-1.5">
            <div className="h-2 w-6 rounded-t-sm bg-muted-foreground/60" />
            <div className="h-2 w-6 rounded-t-sm bg-muted-foreground/25" />
            <div className="h-2 w-6 rounded-t-sm bg-muted-foreground/25" />
          </div>
          <div className="flex-1 mx-1.5 mb-1.5 rounded-b-sm bg-muted-foreground/20 border border-muted-foreground/15 border-t-0" />
        </div>
      );

    case "breadcrumbs":
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <div className="flex items-center gap-1 px-2">
            <div className="h-1 w-5 rounded-sm bg-muted-foreground/35" />
            <span className="text-[8px] text-muted-foreground/40">›</span>
            <div className="h-1 w-6 rounded-sm bg-muted-foreground/35" />
            <span className="text-[8px] text-muted-foreground/40">›</span>
            <div className="h-1 w-4 rounded-sm bg-muted-foreground/55" />
          </div>
        </div>
      );

    case "nav-bar":
      return (
        <div className={shell}>
          <div className="flex items-center justify-between px-2 h-full">
            <div className="h-2.5 w-5 rounded-sm bg-muted-foreground/60" />
            <div className="flex gap-1">
              <div className="h-1 w-4 rounded-sm bg-muted-foreground/35" />
              <div className="h-1 w-5 rounded-sm bg-muted-foreground/35" />
              <div className="h-1 w-4 rounded-sm bg-muted-foreground/35" />
            </div>
            <div className="h-2.5 w-4 rounded-sm bg-primary/60" />
          </div>
        </div>
      );

    case "footer-columns":
    case "copyright-bar":
      return (
        <div className={shell}>
          <div className="grid grid-cols-4 gap-1 p-1.5 h-full">
            {[0, 1, 2, 3].map((c) => (
              <div key={c} className="flex flex-col gap-0.5">
                <div className="h-1.5 rounded-sm bg-muted-foreground/55" />
                <div className="h-1 rounded-sm bg-muted-foreground/25" />
                <div className="h-1 rounded-sm bg-muted-foreground/25" />
                <div className="h-1 w-2/3 rounded-sm bg-muted-foreground/25" />
              </div>
            ))}
          </div>
        </div>
      );

    case "social-links":
      return (
        <div className={cn(shell, "items-center justify-center gap-1")}>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-4 w-4 rounded-full bg-muted-foreground/45"
              />
            ))}
          </div>
        </div>
      );

    case "bundle-spotlight":
    case "gift-card-redeem":
      return (
        <div className={shell}>
          <div className="flex items-center gap-1.5 p-1.5 h-full">
            <div className={cn(rect, "w-10 h-full")} />
            <div className="flex flex-col gap-1 flex-1">
              <div className={cn(bar, "w-full")} />
              <div className={cn(bar, "w-[70%]")} />
              <div className={cn(pill, "w-8 h-2 mt-0.5")} />
            </div>
          </div>
        </div>
      );

    case "size-guide":
    case "policy-strip":
      return (
        <div className={shell}>
          <div className="flex flex-col gap-0.5 p-1.5 h-full justify-center">
            <div className="flex gap-1">
              <div className={cn(bar, "w-6")} />
              <div className={cn(bar, "w-6")} />
              <div className={cn(bar, "w-6")} />
            </div>
            <div className="flex gap-1">
              <div className={cn(barStrong, "w-6")} />
              <div className={cn(bar, "w-6")} />
              <div className={cn(bar, "w-6")} />
            </div>
          </div>
        </div>
      );

    case "logo-mark":
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <div className="h-6 w-6 rounded-md bg-primary/70 grid place-items-center text-primary-foreground text-[10px] font-bold">
            A
          </div>
        </div>
      );

    case "embed":
    case "custom-html":
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <div className="text-[10px] font-mono text-muted-foreground/60">
            &lt;/&gt;
          </div>
        </div>
      );

    case "empty-state":
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <CircleSlash size={18} className="text-muted-foreground/50" />
        </div>
      );

    default: {
      const Icon = getBlockIcon(kind);
      return (
        <div className={cn(shell, "items-center justify-center")}>
          <div className="h-8 w-8 rounded-md bg-card border border-border grid place-items-center text-muted-foreground">
            <Icon size={15} />
          </div>
        </div>
      );
    }
  }
}
