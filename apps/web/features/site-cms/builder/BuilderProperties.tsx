"use client";

import type { JSX } from "react";
import type { BlockNode } from "@repo/shared";
import { BLOCK_CATALOG_ENTRIES } from "@repo/shared";
import { Pill } from "../components/ui";

interface BuilderPropertiesProps {
  selectedBlock: BlockNode | null;
  activeTab: "page" | "block" | "seo" | "history";
  onTabChange: (tab: "page" | "block" | "seo" | "history") => void;
}

function getBlockTitle(block: BlockNode): string {
  const catalog = BLOCK_CATALOG_ENTRIES.find((e) => e.kind === block.kind);
  return catalog?.label || block.kind;
}

export function BuilderProperties({
  selectedBlock,
  activeTab,
  onTabChange,
}: BuilderPropertiesProps): JSX.Element {
  const tabs = [
    { id: "page", label: "Page" },
    { id: "block", label: "Block" },
    { id: "seo", label: "SEO" },
    { id: "history", label: "History" },
  ] as const;

  return (
    <aside
      style={{
        width: 304,
        borderLeft: "1px solid var(--line)",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--line)",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              padding: "10px 8px",
              fontSize: 12,
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--ink)"
                  : "2px solid transparent",
              color: activeTab === tab.id ? "var(--ink)" : "var(--ink-3)",
              fontWeight: activeTab === tab.id ? 600 : 450,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: 14,
        }}
      >
        {activeTab === "page" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <Section label="Status">
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {["draft", "review", "published"].map((status) => (
                  <button
                    key={status}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 5,
                      background: "transparent",
                      border: "1px solid transparent",
                      fontSize: 12.5,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <Pill tone="info">{status}</Pill>
                    <span style={{ color: "var(--ink-3)", fontSize: 11.5 }}>
                      {status === "draft"
                        ? "Only you"
                        : status === "review"
                          ? "Sent to reviewers"
                          : "Visible on the web"}
                    </span>
                  </button>
                ))}
              </div>
            </Section>

            <Section label="URL">
              <input
                type="text"
                defaultValue="/"
                style={{
                  width: "100%",
                  height: 28,
                  padding: "0 8px",
                  border: "1px solid var(--line)",
                  borderRadius: 5,
                  background: "var(--bg-elev)",
                  fontSize: 12,
                  outline: "none",
                }}
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  marginTop: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  defaultChecked
                  style={{ cursor: "pointer" }}
                />
                <span>Index in sitemap</span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  marginTop: 6,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  defaultChecked
                  style={{ cursor: "pointer" }}
                />
                <span>Show in main nav</span>
              </label>
            </Section>

            <Section label="Layout">
              <Field label="Template">
                <select
                  style={{
                    width: "100%",
                    height: 28,
                    padding: "0 8px",
                    border: "1px solid var(--line)",
                    borderRadius: 5,
                    background: "var(--bg-elev)",
                    fontSize: 12,
                    outline: "none",
                  }}
                >
                  <option>Default</option>
                  <option>Wide</option>
                  <option>Editorial</option>
                </select>
              </Field>
              <Field label="Max width">
                <select
                  style={{
                    width: "100%",
                    height: 28,
                    padding: "0 8px",
                    border: "1px solid var(--line)",
                    borderRadius: 5,
                    background: "var(--bg-elev)",
                    fontSize: 12,
                    outline: "none",
                  }}
                >
                  <option>780px</option>
                  <option>960px</option>
                  <option>1240px</option>
                </select>
              </Field>
            </Section>
          </div>
        )}

        {activeTab === "block" && (
          <div>
            {!selectedBlock ? (
              <div
                style={{
                  padding: "32px 12px",
                  textAlign: "center",
                  color: "var(--ink-4)",
                  fontSize: 12.5,
                }}
              >
                Select a block to edit its properties.
              </div>
            ) : (
              <Section label={`${getBlockTitle(selectedBlock)} block`}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  <Field label="Padding">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="50"
                      style={{
                        width: "100%",
                        accentColor: "var(--accent)",
                      }}
                    />
                  </Field>
                  <Field label="Background">
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        { label: "None", value: "transparent" },
                        { label: "Light", value: "var(--bg-sunken)" },
                        { label: "Dark", value: "var(--ink)" },
                        { label: "Accent", value: "var(--accent-soft)" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          title={option.label}
                          aria-label={`Set background to ${option.label}`}
                          style={{
                            flex: 1,
                            height: 28,
                            borderRadius: 4,
                            background: option.value,
                            border: "1px solid var(--line)",
                            cursor: "pointer",
                          }}
                        />
                      ))}
                    </div>
                  </Field>
                  <Field label="Alignment">
                    <div
                      style={{
                        display: "flex",
                        gap: 2,
                        background: "var(--bg-sunken)",
                        borderRadius: 5,
                        padding: 2,
                      }}
                    >
                      {["Left", "Center", "Right"].map((align) => (
                        <button
                          key={align}
                          style={{
                            flex: 1,
                            height: 22,
                            fontSize: 11.5,
                            borderRadius: 3,
                            background: "transparent",
                            color: "var(--ink-3)",
                            border: "none",
                            cursor: "pointer",
                          }}
                        >
                          {align}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      aria-label="Hide on mobile"
                      style={{ cursor: "pointer" }}
                    />
                    <span>Hide on mobile</span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      aria-label="Animate on scroll"
                      style={{ cursor: "pointer" }}
                    />
                    <span>Animate on scroll</span>
                  </label>
                </div>
              </Section>
            )}
          </div>
        )}

        {activeTab === "seo" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Section label="Search">
              <Field label="Title tag">
                <input
                  type="text"
                  defaultValue="Page title"
                  style={{
                    width: "100%",
                    height: 28,
                    padding: "0 8px",
                    border: "1px solid var(--line)",
                    borderRadius: 5,
                    background: "var(--bg-elev)",
                    fontSize: 12,
                    outline: "none",
                  }}
                />
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--ink-4)",
                    marginTop: 4,
                  }}
                >
                  60 / 70 chars
                </div>
              </Field>
              <Field label="Meta description">
                <textarea
                  defaultValue="Meta description"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid var(--line)",
                    borderRadius: 5,
                    background: "var(--bg-elev)",
                    fontSize: 12,
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                  }}
                />
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--ink-4)",
                    marginTop: 4,
                  }}
                >
                  130 / 160 chars
                </div>
              </Field>
            </Section>
          </div>
        )}

        {activeTab === "history" && (
          <div>
            {[
              { who: "You", time: "just now", note: "Auto-saved", live: true },
              { who: "You", time: "2m ago", note: "Edited content" },
              { who: "Reviewer", time: "1h ago", note: "Left comment" },
            ].map((entry, index) => (
              <div
                key={index}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid var(--line-2)",
                  display: "flex",
                  gap: 10,
                }}
              >
                <div style={{ position: "relative", paddingTop: 4 }}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: entry.live ? "var(--accent)" : "var(--ink-4)",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>
                    {entry.note}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 10.5, color: "var(--ink-4)" }}
                  >
                    {entry.who} · {entry.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10.5,
          color: "var(--ink-4)",
          letterSpacing: 0.5,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
