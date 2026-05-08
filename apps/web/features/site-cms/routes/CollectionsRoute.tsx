"use client";

import type { JSX } from "react";
import { useState } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { useCollections } from "@/features/tenant-site";
import { Btn, Card, StatusPill } from "../components/ui";
import {
  Upload,
  Plus,
  ExternalLink,
  Edit2,
  Filter,
  MoreVertical,
} from "lucide-react";

export function CollectionsRoute(): JSX.Element {
  const { data: collections = [] } = useCollections();
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (collections.length > 0 && collections[0]) {
      return collections[0].id;
    }
    return null;
  });

  const activeCollection = collections.find((c) => c.id === activeId);
  const mockProducts = [
    {
      id: "p1",
      title: "Premium Chair",
      price: 299.99,
      sku: "CHAIR-001",
      stock: 12,
    },
    {
      id: "p2",
      title: "Wooden Table",
      price: 599.99,
      sku: "TABLE-001",
      stock: 5,
    },
    {
      id: "p3",
      title: "Wall Lamp",
      price: 99.99,
      sku: "LAMP-001",
      stock: 0,
    },
  ];

  useSetBreadcrumbs(["Site", "Collections"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn icon={Upload}>Import CSV</Btn>
        <Btn variant="primary" icon={Plus}>
          New collection
        </Btn>
      </div>
    ),
  });

  return (
    <div style={{ padding: "20px 24px 64px", maxWidth: 1320 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: -0.3,
            }}
          >
            Collections
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13 }}>
            Group products into shoppable collections.
          </p>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}
      >
        {/* Left sidebar: collections list */}
        <Card style={{ padding: 0, height: "fit-content" }}>
          {collections.length === 0 ? (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                color: "var(--ink-4)",
                fontSize: 12,
              }}
            >
              No collections yet
            </div>
          ) : (
            collections.map((c, i) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 12px",
                  borderBottom:
                    i < collections.length - 1
                      ? "1px solid var(--line-2)"
                      : "none",
                  background:
                    activeId === c.id ? "var(--bg-active)" : "transparent",
                  textAlign: "left",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    background: "var(--accent)",
                    opacity: activeId === c.id ? 1 : 0.5,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{c.title}</div>
                  <div
                    className="mono"
                    style={{ fontSize: 10.5, color: "var(--ink-4)" }}
                  >
                    {c.productCount} items
                  </div>
                </div>
                {c.isActive && <StatusPill status="active" />}
              </button>
            ))
          )}
        </Card>

        {/* Right side: collection detail + products */}
        {activeCollection ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Collection detail card */}
            <Card>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 6,
                    background:
                      "linear-gradient(135deg, oklch(0.5 0.06 60), oklch(0.3 0.04 30))",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    {activeCollection?.title}
                  </h2>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--ink-4)",
                      marginTop: 2,
                    }}
                  >
                    /collections/
                    {activeCollection?.slug}
                  </div>
                </div>
                <Btn size="sm" icon={ExternalLink}>
                  View on site
                </Btn>
                <Btn size="sm" icon={Edit2}>
                  Edit details
                </Btn>
              </div>
            </Card>

            {/* Products in collection card */}
            <Card>
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                  Products in this collection
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn size="sm" icon={Filter}>
                    Filter
                  </Btn>
                  <Btn size="sm" variant="primary" icon={Plus}>
                    Add product
                  </Btn>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 60px 1.5fr 80px 80px 90px 32px",
                  padding: "8px 14px",
                  background: "var(--bg-sunken)",
                  fontSize: 10.5,
                  color: "var(--ink-4)",
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span />
                <span />
                <span>Name</span>
                <span style={{ textAlign: "right" }}>Price</span>
                <span>SKU</span>
                <span style={{ textAlign: "right" }}>Stock</span>
                <span />
              </div>
              {mockProducts.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 60px 1.5fr 80px 80px 90px 32px",
                    padding: "10px 14px",
                    borderTop: i === 0 ? "1px solid var(--line-2)" : "none",
                    borderBottom:
                      i < mockProducts.length - 1
                        ? "1px solid var(--line-2)"
                        : "none",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    style={{
                      width: 16,
                      height: 16,
                      color: "var(--ink-5)",
                      background: "transparent",
                      border: "none",
                      cursor: "grab",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ⋮⋮
                  </button>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 4,
                      background: `oklch(0.${70 + i * 3} 0.05 ${30 + i * 40})`,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {p.title}
                  </span>
                  <span
                    className="mono"
                    style={{ fontSize: 12, textAlign: "right" }}
                  >
                    ${p.price}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11.5,
                      color: "var(--ink-3)",
                    }}
                  >
                    {p.sku}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 12,
                      textAlign: "right",
                      color: p.stock === 0 ? "var(--danger)" : "var(--ink-2)",
                    }}
                  >
                    {p.stock === 0 ? "out" : p.stock}
                  </span>
                  <button
                    type="button"
                    style={{
                      width: 22,
                      height: 22,
                      color: "var(--ink-4)",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MoreVertical size={13} />
                  </button>
                </div>
              ))}
            </Card>
          </div>
        ) : (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              color: "var(--ink-4)",
              fontSize: 13,
            }}
          >
            No collection selected
          </div>
        )}
      </div>
    </div>
  );
}
