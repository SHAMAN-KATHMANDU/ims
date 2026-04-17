export default function Loading() {
  return (
    <div className="container" style={{ padding: "var(--section-padding) 0" }}>
      <div
        style={{
          height: "2rem",
          width: "25%",
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          marginBottom: "1.5rem",
          animation: "pulse 1.5s infinite",
        }}
      />
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
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <div
              style={{
                aspectRatio: "1 / 1",
                background: "var(--color-surface)",
                borderRadius: "var(--radius)",
                animation: "pulse 1.5s infinite",
              }}
            />
            <div
              style={{
                height: "1rem",
                width: "80%",
                background: "var(--color-surface)",
                borderRadius: "var(--radius)",
                animation: "pulse 1.5s infinite",
              }}
            />
            <div
              style={{
                height: "1rem",
                width: "40%",
                background: "var(--color-surface)",
                borderRadius: "var(--radius)",
                animation: "pulse 1.5s infinite",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
