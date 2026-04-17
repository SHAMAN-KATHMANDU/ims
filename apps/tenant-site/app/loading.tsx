export default function Loading() {
  return (
    <div>
      {/* Hero skeleton */}
      <div
        style={{
          width: "100%",
          height: "clamp(280px, 50vh, 520px)",
          background: "var(--color-surface)",
          animation: "pulse 1.5s infinite",
        }}
      />
      <div
        className="container"
        style={{ padding: "var(--section-padding) 0" }}
      >
        <div
          style={{
            height: "1.5rem",
            width: "30%",
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
          {Array.from({ length: 4 }).map((_, i) => (
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
    </div>
  );
}
