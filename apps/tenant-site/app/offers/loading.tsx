export default function Loading() {
  return (
    <div className="container" style={{ padding: "var(--section-padding) 0" }}>
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div
          style={{
            height: "0.75rem",
            width: "15%",
            margin: "0 auto 0.5rem",
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            animation: "pulse 1.5s infinite",
          }}
        />
        <div
          style={{
            height: "2.25rem",
            width: "30%",
            margin: "0 auto",
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1 / 1",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              animation: "pulse 1.5s infinite",
            }}
          />
        ))}
      </div>
    </div>
  );
}
