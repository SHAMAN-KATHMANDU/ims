"use client";

/**
 * ContentHub — the Content mode landing page.
 *
 * Presents every content type as a card, grouped semantically. Each card
 * links to its existing detail surface; the Hub is the discovery layer,
 * not a new admin DSL. As later phases land (Pages list, Blog list, Forms,
 * Snippets, Testimonials), flip the corresponding card's `disabled: false`
 * and point `path` at the new route.
 *
 * This component reads the workspace slug from the URL via usePathname()
 * so it's a pure client component with no server props.
 */

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  FileText,
  Newspaper,
  Package,
  Layers,
  Image as ImageIcon,
  Users,
  Mail,
  Sparkles,
  Quote,
  HelpCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { useBlogPosts } from "@/features/tenant-blog";
import { useTenantPages } from "@/features/tenant-pages";
import type { ContentTypeCard as ContentTypeCardModel } from "../types";
import { ContentTypeCard } from "./ContentTypeCard";

function workspaceFromPath(pathname: string | null): string {
  if (!pathname) return "admin";
  const seg = pathname.split("/").filter(Boolean)[0];
  return seg ?? "admin";
}

function fmtCount(
  count: number | undefined,
  noun: string,
  isLoading: boolean,
): string {
  if (isLoading) return "Loading…";
  if (count === undefined) return "—";
  if (count === 1) return `1 ${noun}`;
  return `${count} ${noun}`;
}

export function ContentHub() {
  const pathname = usePathname();
  const workspace = workspaceFromPath(pathname);

  const pagesQuery = useTenantPages({ limit: 1 });
  const blogQuery = useBlogPosts({ limit: 1 });

  const cards = useMemo<ContentTypeCardModel[]>(() => {
    const pagesTotal =
      (pagesQuery.data as { total?: number } | undefined)?.total ??
      (Array.isArray(
        (pagesQuery.data as { items?: unknown[] } | undefined)?.items,
      )
        ? ((pagesQuery.data as { items?: unknown[] }).items?.length ??
          undefined)
        : undefined);
    const postsTotal =
      (blogQuery.data as { total?: number } | undefined)?.total ?? undefined;

    return [
      {
        id: "pages",
        label: "Pages",
        description:
          "Custom landing pages, About, Contact — anything outside the storefront flows.",
        icon: FileText,
        path: "content/pages",
        group: "Site content",
        count: fmtCount(pagesTotal, "page", pagesQuery.isLoading),
      },
      {
        id: "blog",
        label: "Blog",
        description:
          "Posts, drafts, and categories. Markdown today; rich blocks in the next phase.",
        icon: Newspaper,
        path: "content/blog",
        group: "Site content",
        count: fmtCount(postsTotal, "post", blogQuery.isLoading),
      },
      {
        id: "snippets",
        label: "Snippets",
        description:
          "Saved block sub-trees you can drop into any page. Edit once, render everywhere.",
        icon: Sparkles,
        path: "content/snippets",
        group: "Site content",
      },
      {
        id: "products",
        label: "Products",
        description: "Catalog items, variants, pricing, and inventory.",
        icon: Package,
        path: "products",
        group: "Catalog",
      },
      {
        id: "categories",
        label: "Categories",
        description: "Catalog hierarchy and attribute taxonomy.",
        icon: Layers,
        path: "products/catalog-settings",
        group: "Catalog",
      },
      {
        id: "media",
        label: "Media library",
        description:
          "Images, videos, and uploaded assets shared across blocks.",
        icon: ImageIcon,
        path: "media",
        group: "Library",
      },
      {
        id: "customers",
        label: "Customers",
        description: "Storefront customers, deals, and CRM contacts.",
        icon: Users,
        path: "crm/contacts",
        group: "Audience",
      },
      {
        id: "forms",
        label: "Form submissions",
        description:
          "Contact-form and lead-capture submissions from the storefront.",
        icon: Mail,
        path: "content/forms",
        group: "Audience",
        disabled: true,
      },
      {
        id: "testimonials",
        label: "Testimonials",
        description: "Reusable quote rows for the Testimonials block.",
        icon: Quote,
        path: "content/testimonials",
        group: "Library",
        disabled: true,
      },
      {
        id: "faq",
        label: "FAQ items",
        description: "Reusable Q&A entries for the FAQ block.",
        icon: HelpCircle,
        path: "content/faq",
        group: "Library",
        disabled: true,
      },
    ];
  }, [
    pagesQuery.data,
    pagesQuery.isLoading,
    blogQuery.data,
    blogQuery.isLoading,
  ]);

  const groups = useMemo(() => {
    const order: ContentTypeCardModel["group"][] = [
      "Site content",
      "Catalog",
      "Library",
      "Audience",
    ];
    return order.map((group) => ({
      group,
      cards: cards.filter((c) => c.group === group),
    }));
  }, [cards]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content"
        description="Manage every piece of content on your site — pages, posts, products, media, and more."
      />
      <div className="space-y-8">
        {groups.map(({ group, cards: groupCards }) => (
          <section
            key={group}
            aria-labelledby={`hub-${group}`}
            className="space-y-3"
          >
            <h2
              id={`hub-${group}`}
              className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
            >
              {group}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groupCards.map((card) => (
                <ContentTypeCard
                  key={card.id}
                  card={card}
                  workspace={workspace}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
