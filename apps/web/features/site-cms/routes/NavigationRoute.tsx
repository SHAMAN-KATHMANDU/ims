"use client";

import type { JSX } from "react";
import { useState } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { Btn, Card, Pill } from "../components/ui";
import {
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  X,
  Zap,
  MoreVertical,
} from "lucide-react";
import { Field, Input, Select, Toggle } from "../components/ui/form-bits";

interface NavItem {
  id: string;
  label: string;
  href: string;
  children?: NavItem[];
}

interface FooterCol {
  id: string;
  title: string;
  links: { label: string; href: string }[];
}

const INITIAL_NAV: NavItem[] = [
  {
    id: "1",
    label: "Home",
    href: "/",
    children: [],
  },
  {
    id: "2",
    label: "Menu",
    href: "/menu",
    children: [
      { id: "2a", label: "Lunch", href: "/menu/lunch" },
      { id: "2b", label: "Dinner", href: "/menu/dinner" },
    ],
  },
  {
    id: "3",
    label: "Reserve",
    href: "/reserve",
    children: [],
  },
  {
    id: "4",
    label: "About",
    href: "/about",
    children: [],
  },
];

const INITIAL_FOOTER: FooterCol[] = [
  {
    id: "f1",
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
    ],
  },
  {
    id: "f2",
    title: "Resources",
    links: [
      { label: "Gift cards", href: "/gift-cards" },
      { label: "Catering", href: "/catering" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    id: "f3",
    title: "Contact",
    links: [
      { label: "Phone", href: "tel:2125550127" },
      { label: "Email", href: "mailto:hello@example.com" },
      { label: "Address", href: "/contact" },
    ],
  },
];

function NavRow({
  item,
  depth,
}: {
  item: NavItem;
  depth: number;
}): JSX.Element {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          margin: "1px 4px",
          borderRadius: 5,
          background: depth === 0 ? "var(--bg-sunken)" : "transparent",
          marginLeft: depth * 22 + 4,
        }}
      >
        <button
          style={{
            width: 14,
            height: 14,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "grab",
          }}
        >
          <GripVertical size={11} style={{ color: "var(--ink-5)" }} />
        </button>
        {item.children && item.children.length > 0 && (
          <button
            onClick={() => setOpen(!open)}
            style={{
              width: 14,
              height: 14,
              background: "none",
              border: "none",
              color: "var(--ink-4)",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        )}
        <span
          contentEditable
          suppressContentEditableWarning
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            outline: "none",
            flex: "0 1 auto",
          }}
        >
          {item.label}
        </span>
        <span
          className="mono"
          style={{ fontSize: 11, color: "var(--ink-4)", flex: 1 }}
        >
          {item.href}
        </span>
        <Pill tone="ghost">
          {item.children && item.children.length > 0
            ? `${item.children.length} children`
            : "link"}
        </Pill>
        <button
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
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
      {open &&
        item.children &&
        item.children.map((c) => (
          <NavRow key={c.id} item={c} depth={depth + 1} />
        ))}
    </div>
  );
}

export function NavigationRoute(): JSX.Element {
  const [tab, setTab] = useState<"primary" | "footer" | "announce" | "mobile">(
    "primary",
  );
  const [items] = useState<NavItem[]>(INITIAL_NAV);
  const [announcementMessage, setAnnouncementMessage] = useState(
    "Fall tasting menu launches Nov 14 — book now",
  );

  useSetBreadcrumbs(["Site", "Navigation"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn>Discard</Btn>
        <Btn variant="primary" icon={Check}>
          Save & publish
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
            Navigation & footer
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13 }}>
            Top navigation, footer columns, and site-wide announcements.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn>Discard</Btn>
          <Btn variant="primary" icon={Check}>
            Save & publish
          </Btn>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 14,
          borderBottom: "1px solid var(--line)",
        }}
      >
        {[
          ["primary", "Primary nav"],
          ["footer", "Footer"],
          ["announce", "Announcement bar"],
          ["mobile", "Mobile menu"],
        ].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k as typeof tab)}
            style={{
              padding: "8px 12px",
              marginBottom: -1,
              borderBottom: `2px solid ${tab === k ? "var(--ink)" : "transparent"}`,
              color: tab === k ? "var(--ink)" : "var(--ink-3)",
              fontSize: 12.5,
              fontWeight: tab === k ? 600 : 450,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}
      >
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
              {tab === "primary"
                ? "Primary navigation"
                : tab === "footer"
                  ? "Footer"
                  : tab === "announce"
                    ? "Announcement bar"
                    : "Mobile menu"}
            </div>
            <Btn size="sm" icon={Plus}>
              Add link
            </Btn>
          </div>

          {tab === "primary" && (
            <div style={{ padding: 8 }}>
              {items.map((it) => (
                <NavRow key={it.id} item={it} depth={0} />
              ))}
            </div>
          )}

          {tab === "footer" && (
            <div
              style={{
                padding: 14,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 14,
              }}
            >
              {INITIAL_FOOTER.map((col) => (
                <div
                  key={col.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: 12,
                    background: "var(--bg-sunken)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 10,
                    }}
                  >
                    <GripVertical size={11} style={{ color: "var(--ink-5)" }} />
                    <span
                      contentEditable
                      suppressContentEditableWarning
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        outline: "none",
                        flex: 1,
                      }}
                    >
                      {col.title}
                    </span>
                    <button
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 3,
                        color: "var(--ink-4)",
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      <MoreVertical size={12} />
                    </button>
                  </div>
                  {col.links.map((l) => (
                    <div
                      key={l.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 6px",
                        borderRadius: 4,
                        fontSize: 12.5,
                      }}
                    >
                      <GripVertical
                        size={10}
                        style={{ color: "var(--ink-5)" }}
                      />
                      <span
                        contentEditable
                        suppressContentEditableWarning
                        style={{ outline: "none" }}
                      >
                        {l.label}
                      </span>
                      <span
                        className="mono"
                        style={{
                          marginLeft: "auto",
                          fontSize: 10.5,
                          color: "var(--ink-4)",
                        }}
                      >
                        {l.href}
                      </span>
                    </div>
                  ))}
                  <button
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: "var(--ink-4)",
                      padding: "6px 6px 0",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    + link
                  </button>
                </div>
              ))}
              <button
                style={{
                  border: "1px dashed var(--line-strong, var(--line))",
                  borderRadius: 6,
                  padding: 12,
                  color: "var(--ink-4)",
                  fontSize: 12.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  background: "none",
                  cursor: "pointer",
                }}
              >
                <Plus size={13} /> Add column
              </button>
            </div>
          )}

          {tab === "announce" && (
            <div style={{ padding: 16 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 5,
                  background: "var(--ink)",
                  color: "var(--bg)",
                  marginBottom: 14,
                }}
              >
                <Zap size={13} />
                <span style={{ fontSize: 12.5, flex: 1 }}>
                  {announcementMessage}
                </span>
                <span style={{ fontSize: 12, opacity: 0.7 }}>Reserve →</span>
                <X size={12} style={{ opacity: 0.6 }} />
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <Field label="Message">
                  <Input
                    value={announcementMessage}
                    onChange={(e) => setAnnouncementMessage(e.target.value)}
                  />
                </Field>
                <Field label="Link target">
                  <Input value="/menus/fall-tasting" mono />
                </Field>
                <Field label="Style">
                  <Select
                    value="Dark band"
                    options={["Dark band", "Soft", "Accent"]}
                  />
                </Field>
                <Toggle label="Dismissible" defaultChecked />
                <Toggle label="Show only on homepage" />
                <Field label="Active period">
                  <div style={{ display: "flex", gap: 6 }}>
                    <Input value="Nov 7, 2026" />
                    <span
                      style={{ alignSelf: "center", color: "var(--ink-4)" }}
                    >
                      →
                    </span>
                    <Input value="Nov 21, 2026" />
                  </div>
                </Field>
              </div>
            </div>
          )}

          {tab === "mobile" && (
            <div
              style={{
                padding: 16,
                color: "var(--ink-3)",
                fontSize: 13,
              }}
            >
              Mobile menu inherits the primary nav by default. Toggle below to
              customize.
              <div style={{ marginTop: 14 }}>
                <Toggle label="Customize mobile menu" />
              </div>
            </div>
          )}
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card style={{ padding: 12 }}>
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                color: "var(--ink-4)",
                letterSpacing: 0.5,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Live preview
            </div>
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: 6,
                overflow: "hidden",
                background: "var(--bg-elev)",
              }}
            >
              <div
                style={{
                  height: 56,
                  padding: "0 16px",
                  borderBottom: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span
                  className="serif"
                  style={{ fontSize: 16, fontWeight: 600 }}
                >
                  Lumen & Coal
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    marginLeft: "auto",
                    fontSize: 12.5,
                  }}
                >
                  {items.slice(0, 5).map((i) => (
                    <span key={i.id} style={{ color: "var(--ink-2)" }}>
                      {i.label}
                    </span>
                  ))}
                </div>
              </div>
              <div
                style={{
                  padding: "30px 16px",
                  textAlign: "center",
                  color: "var(--ink-4)",
                  fontSize: 12,
                }}
              >
                page content
              </div>
              <div
                style={{
                  padding: "20px 16px",
                  borderTop: "1px solid var(--line)",
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 14,
                  background: "var(--bg-sunken)",
                }}
              >
                {INITIAL_FOOTER.map((col) => (
                  <div key={col.id}>
                    <div
                      className="mono"
                      style={{
                        fontSize: 9.5,
                        color: "var(--ink-4)",
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                        marginBottom: 5,
                      }}
                    >
                      {col.title}
                    </div>
                    {col.links.slice(0, 3).map((l) => (
                      <div
                        key={l.label}
                        style={{ fontSize: 11, color: "var(--ink-3)" }}
                      >
                        {l.label}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card style={{ padding: 12 }}>
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                color: "var(--ink-4)",
                letterSpacing: 0.5,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Logo
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 6,
                  background: "var(--ink)",
                  color: "var(--bg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-serif)",
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                L
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <Btn size="sm" icon={Plus}>
                  Replace
                </Btn>
                <span style={{ fontSize: 11, color: "var(--ink-4)" }}>
                  SVG, 1× & 2× recommended
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
