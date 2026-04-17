export default function Loading() {
  return (
    <div className="container" style={{ padding: "var(--section-padding) 0" }}>
      <div
        className="tpl-stack"
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: "2.5rem",
          alignItems: "start",
        }}
      >
        {/* Gallery skeleton */}
        <div
          style={{
            aspectRatio: "1 / 1",
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            animation: "pulse 1.5s infinite",
          }}
        />

        {/* Buybox skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              height: "2.25rem",
              width: "75%",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              animation: "pulse 1.5s infinite",
            }}
          />
          <div
            style={{
              height: "1.5rem",
              width: "30%",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              animation: "pulse 1.5s infinite",
            }}
          />
          <div
            style={{
              height: "4rem",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              animation: "pulse 1.5s infinite",
            }}
          />
          <div
            style={{
              height: "3rem",
              width: "60%",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              marginTop: "0.5rem",
              animation: "pulse 1.5s infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
