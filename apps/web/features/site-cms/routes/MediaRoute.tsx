"use client";

import type { JSX } from "react";
import { useState } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { Btn } from "../components/ui";
import { Folder, Upload, Search, Filter } from "lucide-react";

export function MediaRoute(): JSX.Element {
  const [folder, setFolder] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const hardcodedFolders = [
    "All",
    "Brand",
    "Interior",
    "Exterior",
    "Food",
    "Bar",
    "Team",
    "Documents",
  ];

  useSetBreadcrumbs(["Site", "Media"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn icon={Folder}>New folder</Btn>
        <Btn variant="primary" icon={Upload}>
          Upload
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
            Media
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13 }}>
            312 assets · 4.8 GB of 50 GB used
          </p>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16 }}
      >
        <div>
          <div
            className="mono"
            style={{
              padding: "8px 10px",
              fontSize: 10.5,
              color: "var(--ink-4)",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Folders
          </div>
          {hardcodedFolders.map((f) => (
            <button
              key={f}
              onClick={() => setFolder(f)}
              type="button"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 10px",
                borderRadius: 4,
                background: folder === f ? "var(--bg-active)" : "transparent",
                color: folder === f ? "var(--ink)" : "var(--ink-3)",
                fontSize: 12.5,
                textAlign: "left",
                fontWeight: folder === f ? 600 : 450,
                border: "none",
                cursor: "pointer",
              }}
            >
              <Folder
                size={13}
                style={{
                  color: folder === f ? "var(--accent)" : "var(--ink-4)",
                }}
              />
              <span style={{ flex: 1 }}>{f}</span>
              <span
                className="mono"
                style={{ fontSize: 10.5, color: "var(--ink-4)" }}
              >
                0
              </span>
            </button>
          ))}
        </div>

        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 30,
                padding: "0 10px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: "var(--bg-elev)",
                flex: "0 1 280px",
              }}
            >
              <Search size={13} style={{ color: "var(--ink-4)" }} />
              <input
                type="text"
                placeholder="Search media…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 12.5,
                }}
              />
            </div>
            <Btn icon={Filter}>Type</Btn>
            <div style={{ flex: 1 }} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 10,
            }}
          >
            {/* Placeholder asset cards */}
            {[
              {
                name: "lumen-hero.jpg",
                w: 1920,
                h: 1080,
                size: "2.4 MB",
                color: "oklch(0.70 0.05 30)",
              },
              {
                name: "interior-01.jpg",
                w: 1200,
                h: 800,
                size: "1.8 MB",
                color: "oklch(0.65 0.06 60)",
              },
              {
                name: "food-spread.jpg",
                w: 1600,
                h: 1000,
                size: "2.1 MB",
                color: "oklch(0.68 0.05 50)",
              },
              {
                name: "team-photo.jpg",
                w: 1400,
                h: 900,
                size: "1.9 MB",
                color: "oklch(0.72 0.04 20)",
              },
            ].map((m) => (
              <div
                key={m.name}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  overflow: "hidden",
                  background: "var(--bg-elev)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    aspectRatio: "1",
                    background: m.color,
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                />
                <div style={{ padding: "6px 8px" }}>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {m.name}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: "var(--ink-4)" }}
                  >
                    {m.w}×{m.h} · {m.size}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
