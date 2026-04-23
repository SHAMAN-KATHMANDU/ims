"use client";

import { useState } from "react";
import { Search, Plus, Hash, Pencil } from "lucide-react";
import type { SiteLayoutScope } from "@repo/shared";
import { cn } from "@/lib/utils";
import type { PanelId, EditorTarget } from "./types";

// ---------------------------------------------------------------------------
// Re-export for convenience so callers can grab everything from PagesPanel
// ---------------------------------------------------------------------------
export type { PanelId, EditorTarget };

export const BUILT_IN_SCOPES: { value: SiteLayoutScope; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "products-index", label: "Products" },
  { value: "product-detail", label: "Product detail" },
  { value: "offers", label: "Offers" },
  { value: "blog-index", label: "Blog index" },
  { value: "blog-post", label: "Blog post" },
  { value: "contact", label: "Contact" },
  { value: "404", label: "404 page" },
  { value: "landing", label: "Landing page" },
];

// ---------------------------------------------------------------------------
// PagesPanel
// ---------------------------------------------------------------------------

export function PagesPanel({
  target,
  setTarget,
  customPages,
  onNewCustomPage,
  onEditPageDetails,
}: {
  target: EditorTarget;
  setTarget: (t: EditorTarget) => void;
  customPages: Array<{ id: string; title: string }>;
  onNewCustomPage: () => void;
  onEditPageDetails: (pageId: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = BUILT_IN_SCOPES.filter(
    (s) => q === "" || s.label.toLowerCase().includes(q.toLowerCase()),
  );
  const filteredCustom = customPages.filter(
    (p) => q === "" || p.title.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="flex flex-col h-full">
      <div className="h-11 px-3 flex items-center border-b border-border shrink-0">
        <span className="text-[13px] font-semibold text-foreground flex-1">
          Pages
        </span>
        <button
          onClick={onNewCustomPage}
          className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted"
          title="New custom page"
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="px-3 pt-2.5 pb-2 shrink-0">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages…"
            className="w-full h-7 pl-7 pr-2.5 rounded-md border border-border bg-muted/50 text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">
            Site pages
          </div>
          <div className="flex flex-col gap-0.5">
            {filtered.map((s) => {
              const active = target.scope === s.value && target.pageId === null;
              return (
                <button
                  key={s.value}
                  onClick={() => setTarget({ scope: s.value, pageId: null })}
                  className={cn(
                    "group flex items-center gap-2.5 px-2 h-9 rounded-md w-full text-left transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/80 hover:bg-muted/50",
                  )}
                >
                  <Hash
                    size={12}
                    className={cn(
                      active
                        ? "text-primary-foreground/60"
                        : "text-muted-foreground/60",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium truncate">
                      {s.label}
                    </div>
                    <div
                      className={cn(
                        "text-[10.5px] font-mono truncate",
                        active
                          ? "text-primary-foreground/50"
                          : "text-muted-foreground/60",
                      )}
                    >
                      /{s.value}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Custom pages
            </div>
            <button
              onClick={onNewCustomPage}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
              title="New custom page"
            >
              <Plus size={10} />
              New
            </button>
          </div>
          {filteredCustom.length === 0 && (
            <div className="px-2 py-3 text-[11.5px] text-muted-foreground/60 text-center">
              {customPages.length === 0
                ? "No custom pages yet."
                : "No pages match."}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {filteredCustom.map((p) => {
              const active = target.scope === "page" && target.pageId === p.id;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "group flex items-center gap-2 px-2 h-9 rounded-md transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/80 hover:bg-muted/50",
                  )}
                >
                  <button
                    onClick={() => setTarget({ scope: "page", pageId: p.id })}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                    title="Edit layout blocks"
                  >
                    <Hash
                      size={12}
                      className={cn(
                        active
                          ? "text-primary-foreground/60"
                          : "text-muted-foreground/60",
                      )}
                    />
                    <div className="text-[12.5px] font-medium truncate flex-1">
                      {p.title}
                    </div>
                  </button>
                  <button
                    onClick={() => onEditPageDetails(p.id)}
                    className={cn(
                      "h-6 w-6 grid place-items-center rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
                      active
                        ? "hover:bg-primary-foreground/10 text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground",
                    )}
                    title="Edit page details"
                  >
                    <Pencil size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
