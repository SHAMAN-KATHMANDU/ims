"use client";

import type { JSX } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { useSnippets } from "@/features/snippets";
import { Btn, Card, Pill } from "../components/ui";
import { Code, Plus, MoreVertical } from "lucide-react";

export function SnippetsRoute(): JSX.Element {
  const { data: snippetsResult } = useSnippets();
  const snippets = snippetsResult?.snippets || [];

  useSetBreadcrumbs(["Site", "Snippets"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn icon={Code}>New code snippet</Btn>
        <Btn variant="primary" icon={Plus}>
          New snippet
        </Btn>
      </div>
    ),
  });

  return (
    <div style={{ padding: "20px 24px 64px", maxWidth: 1180 }}>
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
            Snippets
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13 }}>
            Reusable content blocks. Edit once, update everywhere.
          </p>
        </div>
      </div>

      <Card style={{ padding: 0 }}>
        {snippets.length === 0 ? (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              color: "var(--ink-4)",
              fontSize: 13,
            }}
          >
            No snippets yet. Create one to get started.
          </div>
        ) : (
          snippets.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: "grid",
                gridTemplateColumns: "32px 2fr 100px 80px 110px 32px",
                padding: "12px 16px",
                alignItems: "center",
                borderBottom:
                  i < snippets.length - 1 ? "1px solid var(--line-2)" : "none",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink-3)",
                }}
              >
                <Code size={12} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                  {s.category || "Uncategorized"}
                </div>
              </div>
              <Pill tone="ghost">block</Pill>
              <span
                className="mono"
                style={{ fontSize: 11.5, color: "var(--ink-3)" }}
              >
                — uses
              </span>
              <span
                className="mono"
                style={{ fontSize: 11.5, color: "var(--ink-4)" }}
              >
                —
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
          ))
        )}
      </Card>
    </div>
  );
}
