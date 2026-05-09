"use client";

interface HistoryTabProps {
  workspace: string;
  pageId: string;
  scope: string;
}

export function HistoryTab({ workspace, pageId, scope }: HistoryTabProps) {
  const versions = [
    { who: "You", time: "just now", note: "Auto-saved", live: true },
    { who: "You", time: "2m ago", note: "Edited heading" },
    { who: "Teammate", time: "1h ago", note: "Published v22" },
    { who: "You", time: "yesterday", note: "Added image block" },
  ];

  return (
    <div
      style={{
        backgroundColor: "var(--bg)",
      }}
    >
      {versions.map((version, idx) => (
        <div
          key={idx}
          className="px-3.5 py-2.5 border-b flex gap-2.5"
          style={{
            borderBottomColor: "var(--line-2)",
          }}
        >
          <div className="pt-1 relative">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: version.live
                  ? "var(--accent)"
                  : "var(--ink-4)",
              }}
            />
            {idx < versions.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: "3px",
                  top: "8px",
                  bottom: "-12px",
                  width: "1px",
                  backgroundColor: "var(--line)",
                }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-xs font-medium"
              style={{ color: "var(--ink)" }}
            >
              {version.note}
            </div>
            <div
              className="text-xs mt-0.5 font-mono"
              style={{ color: "var(--ink-4)" }}
            >
              {version.who} · {version.time}
            </div>
          </div>
          <button
            className="text-xs font-mono"
            style={{ color: "var(--ink-3)" }}
          >
            restore
          </button>
        </div>
      ))}
    </div>
  );
}
