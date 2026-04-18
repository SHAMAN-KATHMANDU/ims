"use client";

/**
 * RecentlyViewedClient — reads the localStorage queue and renders cards.
 *
 * Storage shape (key "recently-viewed-v1"): a JSON array of product
 * summaries, most-recent first, capped at MAX_STORED. On each PDP visit
 * we push the current product to the front (dedup by id). The display
 * respects a smaller `limit` prop so the strip stays balanced with the
 * surrounding blueprint.
 */

import Link from "next/link";
import { useEffect, useState } from "react";

interface StoredProduct {
  id: string;
  name: string;
  photoUrl: string | null;
  finalSp: string;
  mrp: string;
  categoryName: string | null;
}

interface Props {
  heading?: string;
  limit: number;
  columns: 2 | 3 | 4;
  hideWhenEmpty: boolean;
  excludeCurrent: boolean;
  currentSummary: StoredProduct | null;
  wrapperHasPadY: boolean;
}

const STORAGE_KEY = "recently-viewed-v1";
const MAX_STORED = 12;

function readQueue(): StoredProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is StoredProduct =>
        p != null &&
        typeof p === "object" &&
        typeof p.id === "string" &&
        typeof p.name === "string",
    );
  } catch {
    return [];
  }
}

function writeQueue(queue: StoredProduct[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // quota exceeded / disabled — silent.
  }
}

function formatPrice(value: string): string {
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function RecentlyViewedClient({
  heading,
  limit,
  columns,
  hideWhenEmpty,
  excludeCurrent,
  currentSummary,
  wrapperHasPadY,
}: Props) {
  const [items, setItems] = useState<StoredProduct[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const existing = readQueue();
    let next = existing;
    if (currentSummary) {
      next = [
        currentSummary,
        ...existing.filter((p) => p.id !== currentSummary.id),
      ].slice(0, MAX_STORED);
      writeQueue(next);
    }
    const display =
      excludeCurrent && currentSummary
        ? next.filter((p) => p.id !== currentSummary.id)
        : next;
    setItems(display.slice(0, limit));
    setMounted(true);
  }, [currentSummary, excludeCurrent, limit]);

  if (!mounted) return null;
  if (items.length === 0 && hideWhenEmpty) return null;

  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
      <div className="container">
        <h2
          style={{
            fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
            fontFamily: "var(--font-display)",
            marginBottom: "1.75rem",
            textAlign: "center",
          }}
        >
          {heading ?? "Recently viewed"}
        </h2>
        {items.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              color: "var(--color-muted)",
              fontSize: "0.95rem",
            }}
          >
            Products you view will appear here.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: "1.5rem",
            }}
          >
            {items.map((item) => {
              const hasDiscount =
                Number(item.finalSp) < Number(item.mrp) &&
                Number.isFinite(Number(item.mrp));
              return (
                <Link
                  key={item.id}
                  href={`/products/${item.id}`}
                  style={{
                    display: "block",
                    borderRadius: "var(--radius)",
                    border: "1px solid var(--color-border)",
                    overflow: "hidden",
                    color: "var(--color-text)",
                    textDecoration: "none",
                    background: "var(--color-background)",
                  }}
                >
                  <div
                    style={{
                      aspectRatio: "3/4",
                      background: "var(--color-surface)",
                      position: "relative",
                    }}
                  >
                    {item.photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.photoUrl}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : null}
                  </div>
                  <div style={{ padding: "0.85rem 1rem 1.1rem" }}>
                    {item.categoryName && (
                      <div
                        style={{
                          fontSize: "0.66rem",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--color-muted)",
                          marginBottom: "0.3rem",
                        }}
                      >
                        {item.categoryName}
                      </div>
                    )}
                    <div
                      style={{
                        fontWeight: 500,
                        fontSize: "0.95rem",
                        lineHeight: 1.35,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        marginBottom: "0.3rem",
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "0.5rem",
                        fontSize: "0.92rem",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        {formatPrice(item.finalSp)}
                      </span>
                      {hasDiscount && (
                        <span
                          style={{
                            textDecoration: "line-through",
                            color: "var(--color-muted)",
                            fontSize: "0.8rem",
                          }}
                        >
                          {formatPrice(item.mrp)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
