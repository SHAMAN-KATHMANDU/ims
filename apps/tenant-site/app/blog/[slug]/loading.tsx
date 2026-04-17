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
          height: "0.85rem",
          width: "25%",
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          marginBottom: "1rem",
          animation: "pulse 1.5s infinite",
        }}
      />
      <div
        style={{
          height: "2.75rem",
          width: "85%",
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          marginBottom: "1.5rem",
          animation: "pulse 1.5s infinite",
        }}
      />
      <div
        style={{
          aspectRatio: "16 / 9",
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          marginBottom: "2rem",
          animation: "pulse 1.5s infinite",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: "1rem",
              width: `${100 - (i % 4) * 10}%`,
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
