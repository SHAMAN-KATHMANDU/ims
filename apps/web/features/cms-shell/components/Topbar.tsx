"use client";

import { usePathname } from "next/navigation";
import { Bell, ExternalLink } from "lucide-react";
import { useTopbarActionsStore } from "@/store/topbar-actions-store";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  pages: "Pages",
  blog: "Blog",
  blocks: "Blocks",
  snippets: "Snippets",
  media: "Media",
  collections: "Collections",
  offers: "Offers",
  navigation: "Navigation",
  design: "Design",
  domains: "Domains",
  seo: "SEO & redirects",
  forms: "Forms",
  settings: "Settings",
};

function breadcrumbsFromPathname(pathname: string): string[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: string[] = [];

  if (parts.includes("content")) {
    crumbs.push("Site");
    const idx = parts.indexOf("content");
    const segment =
      idx >= 0 && idx + 1 < parts.length ? parts[idx + 1] : undefined;
    if (segment) {
      const label =
        SEGMENT_LABELS[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1);
      crumbs.push(label);
    }
  }

  return crumbs.length ? crumbs : ["Dashboard"];
}

export function Topbar() {
  const pathname = usePathname();
  const actions = useTopbarActionsStore((state) => state.actions);
  const crumbs = breadcrumbsFromPathname(pathname);

  return (
    <div
      className="h-12 border-b sticky top-0 z-10 flex items-center"
      style={{
        backgroundColor: "var(--bg-elev)",
        borderColor: "var(--line)",
        padding: "0 16px",
      }}
    >
      {/* Breadcrumbs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flex: 1,
          minWidth: 0,
        }}
      >
        {crumbs &&
          crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                {i > 0 && (
                  <span
                    style={{
                      color: "var(--ink-5)",
                      fontSize: "12px",
                    }}
                  >
                    /
                  </span>
                )}
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: isLast ? 600 : 450,
                    color: isLast ? "var(--ink)" : "var(--ink-3)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c}
                </span>
              </div>
            );
          })}
      </div>

      {/* Actions area */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexShrink: 0,
        }}
      >
        {actions}

        {/* Notifications */}
        <button
          style={{
            width: 28,
            height: 28,
            borderRadius: "6px",
            border: "1px solid var(--line)",
            backgroundColor: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-3)",
            cursor: "pointer",
            position: "relative",
            transition: "background-color 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg)";
          }}
        >
          <Bell size={14} />
          <span
            style={{
              position: "absolute",
              top: 5,
              right: 5,
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "var(--accent)",
            }}
          />
        </button>

        {/* Live site button */}
        <button
          style={{
            height: 28,
            padding: "0 10px",
            borderRadius: "6px",
            border: "1px solid var(--line)",
            backgroundColor: "var(--bg)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--ink-2)",
            fontSize: "12px",
            cursor: "pointer",
            transition: "background-color 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg)";
          }}
          title="View live site"
        >
          <ExternalLink size={13} />
          Live site
        </button>
      </div>
    </div>
  );
}
