"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Pill-style nav rendered above every /settings/site/* page.
 *
 *   "Website" → /settings/site           (branding + sections + template + publish)
 *   "Pages"   → /settings/site/pages     (custom About/FAQ/Shipping pages)
 *   "Blog"    → /settings/site/blog      (posts + categories)
 *
 * Uses link-based navigation rather than shadcn <Tabs> because the three
 * tabs host entirely separate routes with their own URLs — visitors should
 * be able to deep-link to /settings/site/blog/new or /settings/site/pages/new
 * and land directly there.
 */
export function SiteTabsNav() {
  const pathname = usePathname() ?? "";
  const params = useParams() as { workspace?: string };
  const workspace = params.workspace ?? "";
  const base = `/${workspace}/settings/site`;

  const isBlog = pathname.startsWith(`${base}/blog`);
  const isPages = pathname.startsWith(`${base}/pages`);
  const isWebsite = !isBlog && !isPages;

  const tabs = [
    { href: base, label: "Website", active: isWebsite },
    { href: `${base}/pages`, label: "Pages", active: isPages },
    { href: `${base}/blog`, label: "Blog", active: isBlog },
  ];

  return (
    <nav className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "inline-flex h-7 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
            t.active
              ? "bg-background text-foreground shadow-sm"
              : "hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
