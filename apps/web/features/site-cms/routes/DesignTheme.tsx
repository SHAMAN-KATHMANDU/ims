"use client";

import type { JSX } from "react";
import { useState } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { Btn, Card } from "../components/ui";
import { Field, Select, Toggle } from "../components/ui/form-bits";
import { RotateCcw, Check, Sparkles, Pencil } from "lucide-react";

interface ColorToken {
  name: string;
  token: string;
  value: string;
}

interface FontFamily {
  role: "Display" | "Body" | "Mono";
  family: string;
  sample: string;
}

export function DesignTheme(): JSX.Element {
  const [selectedBorderRadius, setSelectedBorderRadius] = useState(4);
  const [containerWidth, setContainerWidth] = useState("1280px");
  const [sectionSpacing, setSectionSpacing] = useState("Generous");
  const [grainTexture, setGrainTexture] = useState(true);
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");

  const colors: ColorToken[] = [
    { name: "Background", token: "--bg", value: "Coal 50" },
    { name: "Ink primary", token: "--ink", value: "Coal 900" },
    { name: "Ink muted", token: "--ink-3", value: "Coal 500" },
    { name: "Accent", token: "--accent", value: "Ember 600" },
    { name: "Surface", token: "--surface", value: "Linen 100" },
    { name: "Line", token: "--line", value: "Coal 200" },
  ];

  const fonts: FontFamily[] = [
    { role: "Display", family: "Tiempos", sample: "Aa" },
    { role: "Body", family: "Söhne", sample: "Aa" },
    { role: "Mono", family: "JetBrains Mono", sample: "0a" },
  ];

  useSetBreadcrumbs(["Site", "Design"], {
    subline: "Global tokens for the site theme.",
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn icon={RotateCcw}>Revert</Btn>
        <Btn variant="primary" icon={Check}>
          Save & publish
        </Btn>
      </div>
    ),
  });

  return (
    <div style={{ padding: "20px 24px 64px", maxWidth: 1280 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left column: editable controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Color Palette Card */}
          <Card padded>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10.5,
                  color: "var(--ink-4)",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Color palette
              </div>
              <Btn size="sm" icon={Sparkles}>
                Generate
              </Btn>
            </div>
            {colors.map((c) => (
              <div
                key={c.token}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 8px",
                  borderRadius: 5,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    background: `var(${c.token})`,
                    border: "1px solid var(--line)",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>
                    {c.name}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-4)" }}
                  >
                    {c.token}
                  </div>
                </div>
                <span
                  className="mono"
                  style={{ fontSize: 11.5, color: "var(--ink-3)" }}
                >
                  {c.value}
                </span>
                <button
                  type="button"
                  style={{
                    width: 22,
                    height: 22,
                    color: "var(--ink-4)",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label={`Edit ${c.name}`}
                >
                  <Pencil size={11} />
                </button>
              </div>
            ))}
          </Card>

          {/* Typography Card */}
          <Card padded>
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
              Typography
            </div>
            {fonts.map((f) => (
              <div
                key={f.role}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid var(--line-2)",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 5,
                    border: "1px solid var(--line)",
                    background: "var(--bg-sunken)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily:
                      f.role === "Display"
                        ? "var(--font-serif)"
                        : f.role === "Mono"
                          ? "var(--font-mono)"
                          : "var(--font-sans)",
                    fontSize: 22,
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {f.sample}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{f.role}</div>
                  <div
                    className="mono"
                    style={{ fontSize: 11, color: "var(--ink-4)" }}
                  >
                    {f.family}
                  </div>
                </div>
                <Btn size="sm">Change</Btn>
              </div>
            ))}
          </Card>

          {/* Layout Card */}
          <Card padded>
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
              Layout
            </div>
            <Field label="Container width">
              <Select
                value={containerWidth}
                onChange={(value) => setContainerWidth(value)}
                options={["1024px", "1200px", "1280px", "1440px", "Full"]}
              />
            </Field>
            <Field label="Section spacing">
              <Select
                value={sectionSpacing}
                onChange={(value) => setSectionSpacing(value)}
                options={["Tight", "Standard", "Generous", "Editorial"]}
              />
            </Field>
            <Field label="Border radius">
              <div style={{ display: "flex", gap: 6 }}>
                {[0, 2, 4, 8, 12].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedBorderRadius(r)}
                    style={{
                      flex: 1,
                      height: 32,
                      border: "1px solid var(--line)",
                      borderRadius: 4,
                      background:
                        r === selectedBorderRadius
                          ? "var(--bg-active)"
                          : "var(--bg-elev)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color:
                        r === selectedBorderRadius
                          ? "var(--ink)"
                          : "var(--ink-3)",
                      cursor: "pointer",
                      transition: "all 80ms",
                    }}
                  >
                    {r}px
                  </button>
                ))}
              </div>
            </Field>
            <Toggle
              label="Grain texture overlay"
              checked={grainTexture}
              onCheckedChange={setGrainTexture}
            />
          </Card>
        </div>

        {/* Right column: Live theme preview */}
        <Card
          style={{
            position: "sticky",
            top: 12,
            height: "fit-content",
            padding: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                color: "var(--ink-4)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Live theme preview
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <Btn
                size="sm"
                variant={themeMode === "light" ? "primary" : "ghost"}
                onClick={() => setThemeMode("light")}
              >
                Light
              </Btn>
              <Btn
                size="sm"
                variant={themeMode === "dark" ? "primary" : "ghost"}
                onClick={() => setThemeMode("dark")}
              >
                Dark
              </Btn>
            </div>
          </div>

          <div
            style={{
              padding: 28,
              background: "var(--surface, var(--bg-elev))",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                color: "var(--ink-4)",
                letterSpacing: 0.6,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Issue №007 · Autumn
            </div>
            <div
              className="serif"
              style={{
                fontSize: 38,
                fontWeight: 600,
                letterSpacing: -0.6,
                lineHeight: 1.05,
                color: "var(--ink)",
                marginBottom: 12,
              }}
            >
              A short reading on the long heat of almond wood.
            </div>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--ink-3)",
                margin: 0,
                marginBottom: 16,
                maxWidth: 460,
              }}
            >
              The fire we use, where it comes from, and what we taste in fish
              that&apos;s been near it.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                style={{
                  height: 36,
                  padding: "0 16px",
                  borderRadius: 4,
                  background: "var(--ink)",
                  color: "var(--bg)",
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Reserve a table
              </button>
              <button
                type="button"
                style={{
                  height: 36,
                  padding: "0 16px",
                  borderRadius: 4,
                  background: "transparent",
                  border: "1px solid var(--line-strong)",
                  color: "var(--ink)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Read the journal
              </button>
            </div>
            <div
              style={{
                marginTop: 24,
                padding: 14,
                border: "1px solid var(--line)",
                borderRadius: 6,
                background: "var(--bg)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  background: "var(--accent)",
                }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Card surface
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-4)" }}
                >
                  component preview
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
