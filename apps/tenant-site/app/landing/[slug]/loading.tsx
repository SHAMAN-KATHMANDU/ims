export default function Loading() {
  return (
    <div>
      <div
        style={{
          width: "100%",
          height: "clamp(240px, 40vh, 420px)",
          background: "var(--color-surface)",
          animation: "pulse 1.5s infinite",
        }}
      />
      <div
        className="container"
        style={{ padding: "var(--section-padding) 0" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: i === 1 ? "2rem" : "1rem",
                width: i === 1 ? "40%" : `${70 - i * 5}%`,
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
