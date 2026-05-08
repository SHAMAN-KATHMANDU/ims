"use client";

import type { JSX } from "react";
import { useState } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { Btn, Card, Avatar, StatusPill, Pill, Hr } from "../components/ui";
import {
  Section,
  Field,
  Input,
  TextArea,
  Select,
  Toggle,
} from "../components/ui/form-bits";
import { Plus, Edit2, FileText, MoreVertical } from "lucide-react";

type SettingsTab =
  | "general"
  | "team"
  | "billing"
  | "integrations"
  | "api"
  | "legal";

export function SettingsRoute(): JSX.Element {
  const [tab, setTab] = useState<SettingsTab>("general");

  useSetBreadcrumbs(["Site", "Settings"]);

  const tabs: Array<[SettingsTab, string]> = [
    ["general", "General"],
    ["team", "Team & permissions"],
    ["billing", "Billing"],
    ["integrations", "Integrations"],
    ["api", "API & webhooks"],
    ["legal", "Legal"],
  ];

  const users = [
    {
      n: "Alex Park",
      e: "alex@lumenandcoal.com",
      r: "Owner",
      you: true,
      pending: false,
    },
    {
      n: "Noor Asante",
      e: "noor@lumenandcoal.com",
      r: "Editor",
      you: false,
      pending: false,
    },
    {
      n: "Tomás Vela",
      e: "tomas@lumenandcoal.com",
      r: "Editor",
      you: false,
      pending: false,
    },
    {
      n: "Mira Halsey",
      e: "mira@lumenandcoal.com",
      r: "Author",
      you: false,
      pending: false,
    },
    {
      n: "Reed Quill",
      e: "reed@lumenandcoal.com",
      r: "Viewer",
      you: false,
      pending: true,
    },
    {
      n: "Sasha Boren",
      e: "sasha@lumenandcoal.com",
      r: "Viewer",
      you: false,
      pending: true,
    },
  ];

  const integrations = [
    {
      n: "Resy",
      desc: "Reservations & guest management",
      connected: true,
      color: "oklch(0.55 0.18 25)",
    },
    {
      n: "Mailchimp",
      desc: "Newsletter + audience sync",
      connected: true,
      color: "oklch(0.85 0.15 90)",
    },
    {
      n: "Square",
      desc: "POS + payments + product sync",
      connected: true,
      color: "oklch(0.4 0 0)",
    },
    {
      n: "Stripe",
      desc: "Direct payments for events & gift cards",
      connected: true,
      color: "oklch(0.55 0.2 270)",
    },
    {
      n: "Google Analytics 4",
      desc: "Site analytics",
      connected: true,
      color: "oklch(0.65 0.18 50)",
    },
    {
      n: "Klaviyo",
      desc: "Marketing automation",
      connected: false,
      color: "oklch(0.5 0.12 150)",
    },
    {
      n: "Slack",
      desc: "Notify channel on form submissions",
      connected: false,
      color: "oklch(0.55 0.2 320)",
    },
  ];

  return (
    <div style={{ padding: "20px 24px 64px", maxWidth: 1280 }}>
      <h1
        style={{
          margin: "0 0 18px",
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: -0.3,
        }}
      >
        Settings
      </h1>

      <div
        style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20 }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {tabs.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: "7px 10px",
                borderRadius: 5,
                textAlign: "left",
                background: tab === k ? "var(--bg-active)" : "transparent",
                color: tab === k ? "var(--ink)" : "var(--ink-2)",
                fontSize: 12.5,
                fontWeight: tab === k ? 600 : 450,
                border: "none",
                cursor: "pointer",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {tab === "general" && (
            <>
              <Card style={{ padding: 12 }}>
                <Section label="Site identity">
                  <Field label="Site name">
                    <Input value="Lumen & Coal" />
                  </Field>
                  <Field label="Tagline">
                    <Input value="A wood-fired tasting room in the West Village." />
                  </Field>
                  <Field label="Timezone">
                    <Select
                      value="America/New_York"
                      options={[
                        "America/New_York",
                        "America/Los_Angeles",
                        "Europe/London",
                      ]}
                    />
                  </Field>
                  <Field label="Default language">
                    <Select
                      value="English (US)"
                      options={[
                        "English (US)",
                        "English (UK)",
                        "Français",
                        "Español",
                      ]}
                    />
                  </Field>
                </Section>
              </Card>
              <Card style={{ padding: 12 }}>
                <Section label="Contact">
                  <Field label="Address">
                    <TextArea value="142 Charles St, New York, NY 10014" />
                  </Field>
                  <Field label="Phone">
                    <Input value="+1 (212) 555-0127" mono />
                  </Field>
                  <Field label="Reservations email">
                    <Input value="reservations@lumenandcoal.com" mono />
                  </Field>
                </Section>
              </Card>
            </>
          )}

          {tab === "team" && (
            <Card style={{ padding: 0 }}>
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>
                  {users.length} members ·{" "}
                  {users.filter((m) => m.pending).length} pending
                </div>
                <Btn size="sm" variant="primary" icon={Plus}>
                  Invite
                </Btn>
              </div>
              {users.map((m, i) => (
                <div
                  key={m.e}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1.4fr 100px 100px 32px",
                    padding: "10px 14px",
                    alignItems: "center",
                    gap: 10,
                    borderBottom:
                      i < users.length - 1 ? "1px solid var(--line-2)" : "none",
                  }}
                >
                  <Avatar name={m.n} size={28} />
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {m.n} {m.you && <Pill tone="ghost">You</Pill>}
                    </div>
                    <div
                      className="mono"
                      style={{ fontSize: 11, color: "var(--ink-4)" }}
                    >
                      {m.e}
                    </div>
                  </div>
                  <Pill tone={m.r === "Owner" ? "accent" : "ghost"}>{m.r}</Pill>
                  {m.pending ? (
                    <StatusPill status="pending" />
                  ) : (
                    <span style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                      Active
                    </span>
                  )}
                  <button
                    style={{
                      width: 22,
                      height: 22,
                      color: "var(--ink-4)",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    <MoreVertical size={13} />
                  </button>
                </div>
              ))}
            </Card>
          )}

          {tab === "billing" && (
            <>
              <Card style={{ padding: 12 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        className="mono"
                        style={{
                          fontSize: 10.5,
                          color: "var(--ink-4)",
                          letterSpacing: 0.5,
                          textTransform: "uppercase",
                        }}
                      >
                        Current plan
                      </span>
                      <Pill tone="accent">Studio</Pill>
                    </div>
                    <div
                      style={{
                        fontSize: 26,
                        fontWeight: 600,
                        letterSpacing: -0.4,
                      }}
                    >
                      $48{" "}
                      <span
                        style={{
                          fontSize: 14,
                          color: "var(--ink-4)",
                          fontWeight: 450,
                        }}
                      >
                        / month
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--ink-3)",
                        marginTop: 4,
                      }}
                    >
                      Renews Dec 14, 2026 · billed monthly
                    </div>
                  </div>
                  <Btn>Change plan</Btn>
                  <Btn variant="primary">Manage billing</Btn>
                </div>
              </Card>
              <Card style={{ padding: 12 }}>
                <div
                  className="mono"
                  style={{
                    fontSize: 10.5,
                    color: "var(--ink-4)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 10,
                  }}
                >
                  Usage this period
                </div>
                {[
                  { l: "Bandwidth", v: "84.2 GB", t: "of 500 GB", p: 0.17 },
                  { l: "Build minutes", v: "127", t: "of unlimited", p: 0 },
                  {
                    l: "Form submissions",
                    v: "1,852",
                    t: "of 10,000",
                    p: 0.19,
                  },
                  { l: "Storage", v: "4.8 GB", t: "of 50 GB", p: 0.1 },
                ].map(({ l, v, t, p }) => (
                  <div
                    key={l}
                    style={{
                      padding: "10px 0",
                      borderBottom: "1px solid var(--line-2)",
                    }}
                  >
                    <div
                      style={{ display: "flex", marginBottom: 5, fontSize: 12 }}
                    >
                      <span style={{ flex: 1 }}>{l}</span>
                      <span className="mono" style={{ color: "var(--ink-3)" }}>
                        {v} <span style={{ color: "var(--ink-4)" }}>{t}</span>
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: "var(--bg-sunken)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${p * 100}%`,
                          height: "100%",
                          background: "var(--accent)",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </Card>
            </>
          )}

          {tab === "integrations" && (
            <Card style={{ padding: 0 }}>
              {integrations.map((it, i) => (
                <div
                  key={it.n}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px 1fr 110px 90px",
                    padding: "12px 14px",
                    alignItems: "center",
                    gap: 12,
                    borderBottom:
                      i < integrations.length - 1
                        ? "1px solid var(--line-2)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      background: it.color,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{it.n}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                      {it.desc}
                    </div>
                  </div>
                  {it.connected ? (
                    <StatusPill status="connected" />
                  ) : (
                    <Pill tone="ghost">Not connected</Pill>
                  )}
                  <Btn size="sm" variant={it.connected ? "ghost" : "primary"}>
                    {it.connected ? "Configure" : "Connect"}
                  </Btn>
                </div>
              ))}
            </Card>
          )}

          {tab === "api" && (
            <>
              <Card style={{ padding: 12 }}>
                <Section label="API tokens">
                  <div style={{ marginTop: 6 }}>
                    {[
                      {
                        n: "Production read",
                        token: "sk_live_••••••••••3a92",
                        scope: "read",
                        used: "12 min ago",
                      },
                      {
                        n: "Webhook signing",
                        token: "whsec_••••••••••f01b",
                        scope: "sign",
                        used: "1 hr ago",
                      },
                      {
                        n: "CI deploy bot",
                        token: "sk_live_••••••••••8c11",
                        scope: "write",
                        used: "3 days ago",
                      },
                    ].map((t, i, a) => (
                      <div
                        key={t.n}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.2fr 1.4fr 80px 100px 32px",
                          padding: "10px 0",
                          alignItems: "center",
                          gap: 10,
                          borderBottom:
                            i < a.length - 1
                              ? "1px solid var(--line-2)"
                              : "none",
                          fontSize: 12.5,
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{t.n}</span>
                        <span
                          className="mono"
                          style={{
                            color: "var(--ink-3)",
                            fontSize: 11.5,
                          }}
                        >
                          {t.token}
                        </span>
                        <Pill tone="ghost">{t.scope}</Pill>
                        <span
                          className="mono"
                          style={{ fontSize: 11, color: "var(--ink-4)" }}
                        >
                          {t.used}
                        </span>
                        <button
                          style={{
                            width: 22,
                            height: 22,
                            color: "var(--ink-4)",
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                          }}
                        >
                          <MoreVertical size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Btn size="sm" icon={Plus} style={{ marginTop: 10 }}>
                    New token
                  </Btn>
                </Section>
              </Card>
              <Card style={{ padding: 12 }}>
                <Section label="Webhooks">
                  {[
                    {
                      url: "https://hooks.zapier.com/h/4f81/…",
                      events: "form.submitted, post.published",
                    },
                    {
                      url: "https://api.lumenandcoal.com/site-hook",
                      events: "*",
                    },
                  ].map((w, i, a) => (
                    <div
                      key={w.url}
                      className="mono"
                      style={{
                        padding: "10px 0",
                        fontSize: 11.5,
                        borderBottom:
                          i < a.length - 1 ? "1px solid var(--line-2)" : "none",
                      }}
                    >
                      <div
                        style={{
                          color: "var(--ink-2)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {w.url}
                      </div>
                      <div
                        style={{
                          color: "var(--ink-4)",
                          marginTop: 2,
                        }}
                      >
                        {w.events}
                      </div>
                    </div>
                  ))}
                </Section>
              </Card>
            </>
          )}

          {tab === "legal" && (
            <Card style={{ padding: 12 }}>
              <Section label="Legal pages">
                {[
                  "Privacy policy",
                  "Terms of service",
                  "Accessibility statement",
                  "Cookie policy",
                ].map((p) => (
                  <div
                    key={p}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: "1px solid var(--line-2)",
                    }}
                  >
                    <FileText size={13} style={{ color: "var(--ink-4)" }} />
                    <span style={{ fontSize: 13, flex: 1 }}>{p}</span>
                    <span
                      className="mono"
                      style={{ fontSize: 11, color: "var(--ink-4)" }}
                    >
                      updated 2 weeks ago
                    </span>
                    <Btn size="sm" icon={Edit2}>
                      Edit
                    </Btn>
                  </div>
                ))}
              </Section>
              <Hr />
              <Section label="Cookie banner">
                <Toggle
                  label="Show cookie banner to EU/UK visitors"
                  defaultChecked
                />
                <Toggle
                  label="Require explicit opt-in for analytics"
                  defaultChecked
                />
              </Section>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
