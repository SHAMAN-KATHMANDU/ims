"use client";

import type { JSX } from "react";
import { useMemo, useState } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";
import type { CatalogEntry, CatalogCategory } from "@repo/shared";
import { Btn, Card } from "../components/ui";
import { Plus, Sparkles } from "lucide-react";

interface BlockPreviewProps {
  blockId: string;
}

function BlockPreview({ blockId }: BlockPreviewProps): JSX.Element {
  const iconMap: Record<string, JSX.Element | undefined> = {
    hero: (
      <svg viewBox="0 0 56 40" width="60%" height="60%">
        <rect
          x="6"
          y="10"
          width="40"
          height="3"
          fill="currentColor"
          opacity="0.7"
        />
        <rect
          x="6"
          y="16"
          width="32"
          height="2"
          fill="currentColor"
          opacity="0.4"
        />
        <rect
          x="6"
          y="22"
          width="20"
          height="6"
          rx="1"
          fill="currentColor"
          opacity="0.8"
        />
      </svg>
    ),
    menu: (
      <svg viewBox="0 0 56 40" width="60%" height="60%">
        <line
          x1="6"
          y1="12"
          x2="50"
          y2="12"
          stroke="currentColor"
          opacity="0.4"
          strokeDasharray="1 1.5"
        />
        <line
          x1="6"
          y1="20"
          x2="50"
          y2="20"
          stroke="currentColor"
          opacity="0.4"
          strokeDasharray="1 1.5"
        />
        <line
          x1="6"
          y1="28"
          x2="50"
          y2="28"
          stroke="currentColor"
          opacity="0.4"
          strokeDasharray="1 1.5"
        />
      </svg>
    ),
    feature: (
      <svg viewBox="0 0 56 40" width="60%" height="60%">
        <rect
          x="6"
          y="12"
          width="13"
          height="14"
          rx="1"
          fill="currentColor"
          opacity="0.2"
        />
        <rect
          x="22"
          y="12"
          width="13"
          height="14"
          rx="1"
          fill="currentColor"
          opacity="0.3"
        />
        <rect
          x="38"
          y="12"
          width="13"
          height="14"
          rx="1"
          fill="currentColor"
          opacity="0.4"
        />
      </svg>
    ),
    quote: (
      <svg viewBox="0 0 56 40" width="60%" height="60%">
        <text
          x="6"
          y="22"
          fontSize="20"
          fontFamily="serif"
          fill="currentColor"
          opacity="0.5"
        >
          &quot;
        </text>
        <rect
          x="14"
          y="14"
          width="36"
          height="2"
          fill="currentColor"
          opacity="0.5"
        />
        <rect
          x="14"
          y="20"
          width="28"
          height="2"
          fill="currentColor"
          opacity="0.5"
        />
      </svg>
    ),
    press: (
      <svg viewBox="0 0 56 40" width="60%" height="60%">
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={6 + i * 12}
            y="14"
            width="9"
            height="10"
            rx="1"
            fill="currentColor"
            opacity={0.2 + i * 0.05}
          />
        ))}
      </svg>
    ),
    gallery: (
      <svg viewBox="0 0 56 40" width="60%" height="60%">
        <rect
          x="6"
          y="10"
          width="20"
          height="20"
          rx="1"
          fill="currentColor"
          opacity="0.3"
        />
        <rect
          x="28"
          y="10"
          width="11"
          height="9"
          rx="1"
          fill="currentColor"
          opacity="0.4"
        />
        <rect
          x="28"
          y="21"
          width="11"
          height="9"
          rx="1"
          fill="currentColor"
          opacity="0.5"
        />
        <rect
          x="41"
          y="10"
          width="9"
          height="20"
          rx="1"
          fill="currentColor"
          opacity="0.3"
        />
      </svg>
    ),
    cta: (
      <svg viewBox="0 0 56 40" width="60%" height="60%">
        <rect
          x="6"
          y="14"
          width="44"
          height="14"
          rx="2"
          fill="currentColor"
          opacity="0.7"
        />
        <rect x="38" y="18" width="9" height="6" rx="1" fill="var(--bg-elev)" />
      </svg>
    ),
    default: (
      <svg viewBox="0 0 56 40" width="60%" height="60%">
        <rect
          x="6"
          y="10"
          width="44"
          height="20"
          rx="2"
          fill="currentColor"
          opacity="0.3"
        />
      </svg>
    ),
  };

  const getPreviewIcon = (): JSX.Element => {
    for (const [key, icon] of Object.entries(iconMap)) {
      if (blockId.includes(key) && icon) return icon;
    }
    return iconMap.default || <svg />;
  };

  return (
    <div
      style={{
        color: "var(--ink-3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      {getPreviewIcon()}
    </div>
  );
}

export function BlocksLibrary(): JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories: CatalogCategory[] = useMemo(() => {
    const cats = new Set<CatalogCategory>();
    BLOCK_CATALOG_ENTRIES.forEach((b) => {
      cats.add(b.category);
    });
    return Array.from(cats).sort() as CatalogCategory[];
  }, []);

  const filtered: CatalogEntry[] = useMemo(() => {
    if (selectedCategory === "All") {
      return BLOCK_CATALOG_ENTRIES as CatalogEntry[];
    }
    return BLOCK_CATALOG_ENTRIES.filter(
      (b) => b.category === selectedCategory,
    ) as CatalogEntry[];
  }, [selectedCategory]);

  useSetBreadcrumbs(["Site", "Blocks"], {
    subline: "Reusable sections you can drop into any page.",
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn icon={Sparkles}>Generate from prompt</Btn>
        <Btn variant="primary" icon={Plus}>
          New block
        </Btn>
      </div>
    ),
  });

  return (
    <div style={{ padding: "20px 24px 64px", maxWidth: 1320 }}>
      {/* Category filter pills */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        {["All", ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            type="button"
            style={{
              padding: "5px 10px",
              borderRadius: 99,
              fontSize: 12,
              background:
                cat === selectedCategory ? "var(--ink)" : "var(--bg-elev)",
              color: cat === selectedCategory ? "var(--bg)" : "var(--ink-2)",
              border: `1px solid ${
                cat === selectedCategory ? "var(--ink)" : "var(--line)"
              }`,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 80ms",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Blocks grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        {filtered.map((b) => (
          <Card
            key={(b as unknown as { id?: string }).id || b.kind}
            style={{
              padding: 0,
              overflow: "hidden",
              cursor: "pointer",
              transition: "box-shadow 80ms",
            }}
          >
            <div
              style={{
                aspectRatio: "16/9",
                background: "var(--bg-sunken)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderBottom: "1px solid var(--line)",
                position: "relative",
              }}
            >
              <BlockPreview blockId={b.kind} />
              <span
                className="mono"
                style={{
                  position: "absolute",
                  top: 8,
                  left: 10,
                  fontSize: 10,
                  color: "var(--ink-4)",
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {b.category}
              </span>
            </div>
            <div
              style={{
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{b.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                  {b.description}
                </div>
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 10.5,
                  color: "var(--ink-4)",
                  whiteSpace: "nowrap",
                }}
              >
                —
              </span>
              <button
                type="button"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  color: "var(--ink-3)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label={`Menu for ${b.label}`}
              >
                ⋯
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
