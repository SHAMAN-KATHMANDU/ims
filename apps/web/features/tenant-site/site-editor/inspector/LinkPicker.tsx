"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenantPages } from "@/features/tenant-pages";
import { ExternalLink, Link as LinkIcon } from "lucide-react";

interface LinkPickerProps {
  value?: string;
  onChange: (url: string) => void;
}

type LinkTab = "page" | "url";

export function LinkPicker({ value, onChange }: LinkPickerProps) {
  const [tab, setTab] = useState<LinkTab>("page");
  const [urlInput, setUrlInput] = useState(value || "");
  const { data: pagesData } = useTenantPages({ limit: 1000 });

  const pages = useMemo(() => pagesData?.pages || [], [pagesData?.pages]);

  // Group pages by scope (scope vs custom)
  const groupedPages = useMemo(() => {
    const scopes = pages.filter((p) =>
      ["home", "products-index", "product-detail", "offers"].includes(p.slug),
    );
    const custom = pages.filter(
      (p) =>
        !["home", "products-index", "product-detail", "offers"].includes(
          p.slug,
        ),
    );

    return { scopes, custom };
  }, [pages]);

  const isValidUrl = (url: string) => {
    if (!url) return false;
    return /^(https?:\/\/|\/[a-z])/.test(url);
  };

  const handlePageSelect = (href: string) => {
    onChange(href);
    setTab("page");
  };

  const handleUrlSubmit = () => {
    if (isValidUrl(urlInput)) {
      onChange(urlInput);
    }
  };

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-line">
        <button
          onClick={() => setTab("page")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            tab === "page"
              ? "text-accent border-b-2 border-accent"
              : "text-ink-3 hover:text-ink"
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          Page
        </button>
        <button
          onClick={() => setTab("url")}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            tab === "url"
              ? "text-accent border-b-2 border-accent"
              : "text-ink-3 hover:text-ink"
          }`}
        >
          <ExternalLink className="w-4 h-4" />
          URL
        </button>
      </div>

      {/* Tab content */}
      {tab === "page" ? (
        <div className="space-y-3">
          {groupedPages.scopes.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-ink-3 mb-2">
                Scopes
              </div>
              <div className="space-y-1">
                {groupedPages.scopes.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePageSelect(`/${p.slug}`)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      value === `/${p.slug}`
                        ? "bg-bg-active text-ink font-medium"
                        : "hover:bg-bg-sunken text-ink-2"
                    }`}
                  >
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-2xs text-ink-4">/{p.slug}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {groupedPages.custom.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-ink-3 mb-2">
                Custom
              </div>
              <div className="space-y-1">
                {groupedPages.custom.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePageSelect(`/${p.slug}`)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      value === `/${p.slug}`
                        ? "bg-bg-active text-ink font-medium"
                        : "hover:bg-bg-sunken text-ink-2"
                    }`}
                  >
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-2xs text-ink-4">/{p.slug}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {pages.length === 0 && (
            <div className="text-center py-6 text-ink-4">No pages yet</div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="https://example.com or /relative-path"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="text-xs text-ink-4">
            Enter an absolute URL (https://…) or relative path (/about,
            /products/foo)
          </div>
          <Button
            size="sm"
            onClick={handleUrlSubmit}
            disabled={!isValidUrl(urlInput)}
            className="h-7 text-xs"
          >
            Set URL
          </Button>
        </div>
      )}

      {/* Current value */}
      {value && (
        <div className="text-xs text-ink-4">
          Current: <span className="font-mono text-ink">{value}</span>
        </div>
      )}
    </div>
  );
}
