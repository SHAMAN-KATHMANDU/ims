"use client";

interface PageTabProps {
  workspace: string;
  pageId: string;
  scope: string;
}

export function PageTab({ workspace, pageId, scope }: PageTabProps) {
  return (
    <div
      className="p-3.5 flex flex-col gap-3.5"
      style={{
        backgroundColor: "var(--bg)",
      }}
    >
      {/* Status section */}
      <div>
        <div
          className="text-xs font-mono font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--ink-4)" }}
        >
          Status
        </div>
        <div className="flex flex-col gap-1">
          {["draft", "review", "scheduled", "published"].map((status) => (
            <button
              key={status}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left"
              style={{
                backgroundColor: "transparent",
                border: "1px solid transparent",
                color: "var(--ink-3)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    status === "published" ? "var(--success)" : "var(--warn)",
                }}
              />
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* URL section */}
      <div>
        <div
          className="text-xs font-mono font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--ink-4)" }}
        >
          URL
        </div>
        <input
          type="text"
          defaultValue={`/${scope}`}
          className="w-full h-7 px-2 rounded text-xs font-mono"
          style={{
            border: "1px solid var(--line)",
            backgroundColor: "var(--bg-elev)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
      </div>

      {/* Layout section */}
      <div>
        <div
          className="text-xs font-mono font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--ink-4)" }}
        >
          Layout
        </div>
        <div className="flex flex-col gap-1.5">
          {[
            { label: "Template", value: "Default" },
            { label: "Max width", value: "1240px" },
            { label: "Theme", value: "Inherit" },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs mb-1" style={{ color: "var(--ink-3)" }}>
                {label}
              </div>
              <select
                defaultValue={value}
                className="w-full h-7 px-2 rounded text-xs"
                style={{
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--bg-elev)",
                  color: "var(--ink)",
                }}
              >
                <option>{value}</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
