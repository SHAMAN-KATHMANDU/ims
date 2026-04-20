/**
 * BlockSkeletons — shared primitives for block-level Suspense fallbacks.
 *
 * Used by async server components (FBT, reviews-list, etc.) so the page
 * shell streams immediately while the slow fetch resolves. All skeletons
 * use semantic tokens + the `pulse` keyframe already defined in globals.
 */

interface SectionShellProps {
  wrapperHasPadY?: boolean;
  children: React.ReactNode;
  maxWidth?: number;
  align?: "left" | "center";
}

function SectionShell({
  wrapperHasPadY,
  children,
  maxWidth,
  align = "left",
}: SectionShellProps) {
  return (
    <section
      aria-hidden="true"
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
      <div
        className="container"
        style={maxWidth ? { maxWidth, textAlign: align } : { textAlign: align }}
      >
        {children}
      </div>
    </section>
  );
}

function HeadingBar({
  width = "35%",
  align = "left",
}: {
  width?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      style={{
        height: "2rem",
        width,
        maxWidth: 320,
        background: "var(--color-surface)",
        borderRadius: "var(--radius)",
        margin: align === "center" ? "0 auto 2rem" : "0 0 1.5rem",
        animation: "pulse 1.5s infinite",
      }}
    />
  );
}

export function BlockGridSkeleton({
  wrapperHasPadY,
  columns = 4,
  count,
  heading = true,
  headingAlign = "center",
  aspectRatio = "3/4",
}: {
  wrapperHasPadY?: boolean;
  columns?: 2 | 3 | 4 | 5;
  count?: number;
  heading?: boolean;
  headingAlign?: "left" | "center";
  aspectRatio?: string;
}) {
  const items = count ?? columns;
  return (
    <SectionShell wrapperHasPadY={wrapperHasPadY}>
      {heading && <HeadingBar width="45%" align={headingAlign} />}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: "1.5rem",
        }}
      >
        {Array.from({ length: items }).map((_, i) => (
          <div
            key={i}
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              overflow: "hidden",
              background: "var(--color-background)",
            }}
          >
            <div
              style={{
                aspectRatio,
                background: "var(--color-surface)",
                animation: "pulse 1.5s infinite",
              }}
            />
            <div style={{ padding: "0.85rem 1rem 1.1rem" }}>
              <div
                style={{
                  height: "0.95rem",
                  width: "80%",
                  background: "var(--color-surface)",
                  borderRadius: 4,
                  marginBottom: "0.5rem",
                  animation: "pulse 1.5s infinite",
                }}
              />
              <div
                style={{
                  height: "0.85rem",
                  width: "40%",
                  background: "var(--color-surface)",
                  borderRadius: 4,
                  animation: "pulse 1.5s infinite",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function BlockReviewListSkeleton({
  wrapperHasPadY,
  count = 3,
}: {
  wrapperHasPadY?: boolean;
  count?: number;
}) {
  return (
    <SectionShell wrapperHasPadY={wrapperHasPadY} maxWidth={820}>
      <HeadingBar width="35%" />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "2rem",
          paddingBottom: "1.5rem",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            height: "1.4rem",
            width: 120,
            background: "var(--color-surface)",
            borderRadius: 4,
            animation: "pulse 1.5s infinite",
          }}
        />
        <div
          style={{
            height: "1rem",
            width: 60,
            background: "var(--color-surface)",
            borderRadius: 4,
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <li
            key={i}
            style={{
              paddingBottom: "1.5rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.6rem",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  height: "1rem",
                  width: 90,
                  background: "var(--color-surface)",
                  borderRadius: 4,
                  animation: "pulse 1.5s infinite",
                }}
              />
              <div
                style={{
                  height: "1rem",
                  width: 70,
                  background: "var(--color-surface)",
                  borderRadius: 4,
                  animation: "pulse 1.5s infinite",
                }}
              />
            </div>
            <div
              style={{
                height: "0.9rem",
                width: "100%",
                background: "var(--color-surface)",
                borderRadius: 4,
                marginBottom: "0.5rem",
                animation: "pulse 1.5s infinite",
              }}
            />
            <div
              style={{
                height: "0.9rem",
                width: "72%",
                background: "var(--color-surface)",
                borderRadius: 4,
                animation: "pulse 1.5s infinite",
              }}
            />
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
