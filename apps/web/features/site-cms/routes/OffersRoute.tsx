"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { usePromosPaginated, type PromoCode } from "@/features/promos";
import { Btn, Card, StatusPill, Pill } from "../components/ui";
import { Plus, ExternalLink, MoreVertical } from "lucide-react";

export function OffersRoute(): JSX.Element {
  const { data: promosResult } = usePromosPaginated({ page: 1, limit: 20 });

  useSetBreadcrumbs(["Site", "Offers"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn icon={ExternalLink}>Open in POS</Btn>
        <Btn variant="primary" icon={Plus}>
          New offer
        </Btn>
      </div>
    ),
  });

  const promos = useMemo(() => promosResult?.data ?? [], [promosResult?.data]);

  const stats = useMemo(() => {
    const active = promos.filter((p: PromoCode) => p.isActive).length;
    const redemptions = 118; // Hardcoded placeholder
    const revenue = "$8,420"; // Hardcoded placeholder
    return { active, redemptions, revenue };
  }, [promos]);

  return (
    <div style={{ padding: "20px 24px 64px", maxWidth: 1280 }}>
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
            Offers & promos
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13 }}>
            Promo codes, special events, and limited-time menus.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn icon={ExternalLink}>Open in POS</Btn>
          <Btn variant="primary" icon={Plus}>
            New offer
          </Btn>
        </div>
      </div>

      <Card style={{ padding: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "100px 2fr 90px 1.2fr 110px 90px 130px 32px",
            padding: "8px 16px",
            background: "var(--bg-sunken)",
            fontSize: 10.5,
            color: "var(--ink-4)",
            letterSpacing: 0.4,
            textTransform: "uppercase",
            fontFamily: "var(--font-mono)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span>Code</span>
          <span>Title</span>
          <span>Type</span>
          <span>Value</span>
          <span>Status</span>
          <span style={{ textAlign: "right" }}>Uses</span>
          <span>Window</span>
          <span />
        </div>

        {promos.length > 0 ? (
          promos.map((promo: PromoCode, i: number) => (
            <div
              key={promo.id}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "100px 2fr 90px 1.2fr 110px 90px 130px 32px",
                padding: "12px 16px",
                alignItems: "center",
                borderBottom:
                  i < promos.length - 1 ? "1px solid var(--line-2)" : "none",
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 11.5,
                  padding: "2px 7px",
                  borderRadius: 3,
                  width: "fit-content",
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                }}
              >
                {promo.code}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {promo.description || "Untitled promo"}
              </span>
              <Pill tone="ghost">
                {promo.valueType === "PERCENTAGE" ? "%" : "$"}
              </Pill>
              <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>
                {promo.value}
                {promo.valueType === "PERCENTAGE" ? "%" : " off"}
              </span>
              <StatusPill status={promo.isActive ? "active" : "paused"} />
              <span
                className="mono"
                style={{
                  fontSize: 11.5,
                  color: "var(--ink-3)",
                  textAlign: "right",
                }}
              >
                {promo.usageCount} / {promo.usageLimit ?? "∞"}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                {promo.validFrom ? "Active" : "Not started"}
              </span>
              <button
                style={{
                  width: 22,
                  height: 22,
                  color: "var(--ink-4)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <MoreVertical size={13} />
              </button>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: "var(--ink-3)",
              fontSize: 13,
            }}
          >
            No offers yet
          </div>
        )}
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginTop: 16,
        }}
      >
        {[
          {
            label: "Active offers",
            value: stats.active.toString(),
            sub: "1 ending soon",
          },
          {
            label: "Redemptions this week",
            value: stats.redemptions,
            sub: "+34% vs last week",
          },
          {
            label: "Revenue from promos",
            value: stats.revenue,
            sub: "31 covers",
          },
        ].map((s) => (
          <Card key={s.label} style={{ padding: 12 }}>
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                color: "var(--ink-4)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 6,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: -0.4,
                lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div
              style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 4 }}
            >
              {s.sub}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
