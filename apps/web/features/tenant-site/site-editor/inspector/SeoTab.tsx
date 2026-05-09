"use client";

interface SeoTabProps {
  workspace: string;
  pageId: string;
  scope: string;
}

export function SeoTab({ workspace, pageId, scope }: SeoTabProps) {
  return (
    <div
      className="p-3.5 flex flex-col gap-3.5"
      style={{
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Search section */}
      <div>
        <div
          className="text-xs font-mono font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--ink-4)" }}
        >
          Search
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
              Title tag
            </div>
            <input
              type="text"
              defaultValue="Example Page"
              className="w-full h-7 px-2 rounded text-xs"
              style={{
                border: "1px solid var(--line)",
                backgroundColor: "var(--bg-elev)",
                color: "var(--ink)",
                outline: "none",
              }}
            />
            <div className="mt-1 text-xs" style={{ color: "var(--ink-4)" }}>
              18 / 70 chars
            </div>
          </div>

          <div>
            <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
              Meta description
            </div>
            <textarea
              defaultValue="A description of your page for search results."
              rows={2}
              className="w-full p-2 rounded text-xs"
              style={{
                border: "1px solid var(--line)",
                backgroundColor: "var(--bg-elev)",
                color: "var(--ink)",
                outline: "none",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
            <div className="mt-1 text-xs" style={{ color: "var(--ink-4)" }}>
              52 / 160 chars
            </div>
          </div>

          <div>
            <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
              Canonical
            </div>
            <input
              type="text"
              defaultValue="https://example.com/"
              className="w-full h-7 px-2 rounded text-xs font-mono"
              style={{
                border: "1px solid var(--line)",
                backgroundColor: "var(--bg-elev)",
                color: "var(--ink)",
                outline: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Social preview */}
      <div>
        <div
          className="text-xs font-mono font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--ink-4)" }}
        >
          Social preview
        </div>
        <div
          className="border rounded overflow-hidden"
          style={{
            backgroundColor: "var(--bg-sunken)",
            borderColor: "var(--line)",
          }}
        >
          <div
            style={{
              aspectRatio: "1.91 / 1",
              background:
                "linear-gradient(135deg, oklch(0.45 0.06 50), oklch(0.28 0.05 30))",
            }}
          />
          <div className="p-2">
            <div
              className="text-xs font-mono"
              style={{ color: "var(--ink-4)" }}
            >
              example.com
            </div>
            <div
              className="text-xs font-semibold mt-1"
              style={{ color: "var(--ink)" }}
            >
              Page Title
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>
              Short description here
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
