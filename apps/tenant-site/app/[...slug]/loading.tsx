export default function Loading() {
  return (
    <div
      className="container"
      style={{
        padding: "var(--section-padding) 0",
        maxWidth: 820,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          height: "2.5rem",
          width: "55%",
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          marginBottom: "1.5rem",
          animation: "pulse 1.5s infinite",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: "1rem",
              width: `${100 - (i % 3) * 10}%`,
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
