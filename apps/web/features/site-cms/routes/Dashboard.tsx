"use client";

import { useRouter, useParams } from "next/navigation";
import { Plus, ExternalLink } from "lucide-react";
import { Card, Btn, Pill, Avatar, StatusDot } from "../components/ui";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { useAuthStore, selectUser } from "@/store/auth-store";
import type { JSX } from "react";

// Seed data for the dashboard
const PAGES = [
  {
    id: "1",
    title: "Home",
    slug: "/",
    status: "published",
    updated: "2h ago",
    author: "MK",
  },
  {
    id: "2",
    title: "About",
    slug: "/about",
    status: "published",
    updated: "5h ago",
    author: "DR",
  },
  {
    id: "3",
    title: "Menu",
    slug: "/menu",
    status: "draft",
    updated: "just now",
    author: "MK",
  },
  {
    id: "4",
    title: "Reservations",
    slug: "/reserve",
    status: "scheduled",
    updated: "1d ago",
    author: "SP",
  },
  {
    id: "5",
    title: "Contact",
    slug: "/contact",
    status: "published",
    updated: "3d ago",
    author: "MK",
  },
  {
    id: "6",
    title: "Catering",
    slug: "/catering",
    status: "review",
    updated: "2d ago",
    author: "DR",
  },
];

const DOMAINS = [
  {
    id: "1",
    host: "lumenandcoal.com",
    status: "active",
    primary: true,
    ssl: "valid",
    provider: "Route 53",
  },
  {
    id: "2",
    host: "www.lumenandcoal.com",
    status: "active",
    primary: false,
    ssl: "valid",
    provider: "Route 53",
  },
  {
    id: "3",
    host: "staging.lumenandcoal.com",
    status: "active",
    primary: false,
    ssl: "valid",
    provider: "Route 53",
  },
];

const ACTIVITY = [
  { who: "Mira K.", what: "updated", target: "Home · /", time: "2m" },
  {
    who: "Devon R.",
    what: "published",
    target: "Catering · /catering",
    time: "14m",
  },
  { who: "Sasha P.", what: "created", target: "About · /about", time: "2h" },
  { who: "Mira K.", what: "edited", target: "Menu · /menu", time: "5h" },
];

const TEAM = [
  {
    id: "1",
    initials: "MK",
    name: "Mira K.",
    role: "owner",
    color: "oklch(0.55 0.18 35)",
  },
  {
    id: "2",
    initials: "DR",
    name: "Devon R.",
    role: "editor",
    color: "oklch(0.55 0.18 200)",
  },
  {
    id: "3",
    initials: "SP",
    name: "Sasha P.",
    role: "viewer",
    color: "oklch(0.55 0.18 280)",
  },
];

// Mini sparkline helper
function generateSparkline(
  values: number[],
  width: number = 120,
  height: number = 28,
): { d: string; dArea: string } {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const sx = (i: number) => (i / (values.length - 1)) * width;
  const sy = (v: number) => height - ((v - min) / range) * (height - 2) - 1;

  const d = values
    .map(
      (v, i) => `${i === 0 ? "M" : "L"}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`,
    )
    .join(" ");

  const dArea = `${d} L${width} ${height} L0 ${height} Z`;
  return { d, dArea };
}

export function Dashboard(): JSX.Element {
  const router = useRouter();
  const params = useParams<{ workspace: string }>();
  const user = useAuthStore(selectUser);
  const workspace = (params?.workspace as string) || "";

  useSetBreadcrumbs(["Site", "Dashboard"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn size="md" icon={ExternalLink}>
          Live site
        </Btn>
        <Btn
          size="md"
          variant="primary"
          icon={Plus}
          onClick={() => router.push(`/${workspace}/site/pages`)}
        >
          New page
        </Btn>
      </div>
    ),
  });

  const stats = [
    {
      label: "Visitors · 7d",
      value: "24,810",
      delta: "+12.4%",
      tone: "success" as const,
      spark: [12, 18, 15, 22, 20, 28, 32, 35, 33, 38, 42, 45, 48, 52],
    },
    {
      label: "Avg. session",
      value: "1m 48s",
      delta: "+6s",
      tone: "success" as const,
      spark: [22, 21, 24, 26, 25, 27, 28, 29, 30, 28, 30, 31, 32, 33],
    },
    {
      label: "Pages published · 30d",
      value: "6",
      delta: "+2",
      tone: "success" as const,
      spark: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6],
    },
    {
      label: "Errors · 7d",
      value: "3",
      delta: "−2",
      tone: "ghost" as const,
      spark: [8, 6, 7, 5, 4, 3, 5, 4, 3, 2, 3, 2, 3, 3],
    },
  ];

  const quickActions = [
    { label: "New page", icon: Plus, target: "pages" },
    { label: "Write post", icon: Plus, target: "blog" },
    { label: "Upload media", icon: Plus, target: "media" },
    { label: "Add redirect", icon: Plus, target: "seo" },
    { label: "Edit navigation", icon: Plus, target: "navigation" },
    { label: "Open design", icon: Plus, target: "design" },
  ];

  const firstName = user?.username?.split(" ")[0] || "User";
  const domain = DOMAINS.find((d) => d.primary)?.host || "example.com";

  return (
    <div style={{ padding: "20px 24px 64px", maxWidth: 1320 }}>
      {/* Hero strip */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 20,
          gap: 24,
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-4)",
              letterSpacing: 0.5,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            <StatusDot tone="success" /> Site online · last deployed 14m ago
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: -0.4,
            }}
          >
            Good {new Date().getHours() < 12 ? "morning" : "evening"},{" "}
            {firstName}.
          </h1>
          <p
            style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13.5 }}
          >
            Here&apos;s what&apos;s happening on{" "}
            <span className="mono">{domain}</span> today.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn size="md" icon={ExternalLink}>
            View live
          </Btn>
          <Btn
            size="md"
            variant="primary"
            icon={Plus}
            onClick={() => router.push(`/${workspace}/site/pages`)}
          >
            New page
          </Btn>
        </div>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {stats.map((s) => {
          const sp = generateSparkline(s.spark);
          return (
            <Card
              key={s.label}
              padded
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10.5,
                  color: "var(--ink-4)",
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: -0.5,
                  }}
                >
                  {s.value}
                </div>
                <Pill tone={s.tone}>{s.delta}</Pill>
              </div>
              <svg
                viewBox={`0 0 120 28`}
                width="100%"
                height="28"
                preserveAspectRatio="none"
                style={{ marginTop: 2 }}
              >
                <path d={sp.dArea} fill="var(--accent-soft)" opacity={0.5} />
                <path
                  d={sp.d}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.4"
                />
              </svg>
            </Card>
          );
        })}
      </div>

      {/* Two-col */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 12,
        }}
      >
        {/* Left col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Quick actions */}
          <Card style={{ padding: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                Quick actions
              </div>
              <div
                className="mono"
                style={{ fontSize: 10.5, color: "var(--ink-4)" }}
              >
                ⌘K to search
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              {quickActions.map((a) => {
                const ActionIcon = a.icon;
                return (
                  <button
                    key={a.label}
                    onClick={() =>
                      router.push(`/${workspace}/site/${a.target}`)
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      border: "1px solid var(--line)",
                      borderRadius: 6,
                      background: "var(--bg-sunken)",
                      textAlign: "left",
                      color: "var(--ink-2)",
                      cursor: "pointer",
                    }}
                  >
                    <ActionIcon size={15} style={{ color: "var(--accent)" }} />
                    <span style={{ fontSize: 12.5, fontWeight: 500 }}>
                      {a.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Recently edited */}
          <Card>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                Recently edited
              </div>
              <button
                onClick={() => router.push(`/${workspace}/site/pages`)}
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--ink-3)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                View all pages →
              </button>
            </div>
            <div>
              {PAGES.slice(0, 6).map((p, i) => (
                <button
                  key={p.id}
                  onClick={() =>
                    router.push(`/${workspace}/site/pages/${p.id}`)
                  }
                  style={{
                    display: "grid",
                    gridTemplateColumns: "20px 1fr 100px 90px 70px",
                    gap: 12,
                    alignItems: "center",
                    width: "100%",
                    padding: "10px 14px",
                    borderBottom: i < 5 ? "1px solid var(--line-2)" : "none",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ color: "var(--ink-4)" }}>📄</div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}
                    >
                      {p.title}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: 11, color: "var(--ink-4)" }}
                    >
                      {p.slug}
                    </div>
                  </div>
                  <Pill
                    tone={
                      p.status === "review"
                        ? "warn"
                        : p.status === "scheduled"
                          ? "info"
                          : p.status === "draft"
                            ? "ghost"
                            : "success"
                    }
                  >
                    {p.status}
                  </Pill>
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-3)" }}
                  >
                    {p.updated}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--ink-3)",
                      textAlign: "right",
                    }}
                  >
                    {p.author}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right col */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Publishing pipeline */}
          <Card padded>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>
              Publishing pipeline
            </div>
            {[
              { label: "Drafts", count: 2, tone: "default" as const },
              { label: "In review", count: 2, tone: "warn" as const },
              { label: "Scheduled", count: 2, tone: "info" as const },
              { label: "Live", count: 14, tone: "success" as const },
            ].map((row, i) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderTop: i > 0 ? "1px solid var(--line-2)" : "none",
                }}
              >
                <StatusDot tone={row.tone} />
                <span style={{ flex: 1, fontSize: 13 }}>{row.label}</span>
                <span
                  className="mono"
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  {row.count}
                </span>
              </div>
            ))}
          </Card>

          {/* Domains health */}
          <Card>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Domains</div>
              <button
                onClick={() => router.push(`/${workspace}/site/domains`)}
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--ink-3)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Manage →
              </button>
            </div>
            <div style={{ padding: "8px 0" }}>
              {DOMAINS.slice(0, 4).map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: "8px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <StatusDot
                    tone={d.status === "active" ? "success" : "warn"}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="mono"
                      style={{ fontSize: 12.5, color: "var(--ink)" }}
                    >
                      {d.host}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-4)" }}>
                      {d.primary ? "Primary · " : ""}
                      {d.ssl === "valid" ? "SSL valid" : `SSL ${d.ssl}`} ·{" "}
                      {d.provider}
                    </div>
                  </div>
                  {d.primary && <Pill tone="accent">Primary</Pill>}
                </div>
              ))}
            </div>
          </Card>

          {/* Activity */}
          <Card>
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Activity</div>
            </div>
            <div style={{ padding: 4 }}>
              {ACTIVITY.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "8px 12px",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ position: "relative", paddingTop: 4 }}>
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: "var(--ink-4)",
                      }}
                    />
                    {i < ACTIVITY.length - 1 && (
                      <div
                        style={{
                          position: "absolute",
                          left: 2.5,
                          top: 12,
                          width: 1,
                          bottom: -8,
                          background: "var(--line)",
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      fontSize: 12.5,
                      lineHeight: 1.45,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{a.who}</span>{" "}
                    <span style={{ color: "var(--ink-3)" }}>{a.what}</span>{" "}
                    <span style={{ fontWeight: 500 }}>{a.target}</span>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10.5,
                        color: "var(--ink-4)",
                        marginTop: 1,
                      }}
                    >
                      {a.time} ago
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Team */}
          <Card padded>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Team</div>
              <button
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--ink-3)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Invite +
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {TEAM.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Avatar initials={t.initials} color={t.color} size={26} />
                  <div>
                    <div
                      style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.2 }}
                    >
                      {t.name}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10.5,
                        color: "var(--ink-4)",
                      }}
                    >
                      {t.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
