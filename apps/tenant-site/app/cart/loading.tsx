export default function Loading() {
  return (
    <div className="container" style={{ padding: "var(--section-padding) 0" }}>
      <div
        style={{
          height: "2rem",
          width: "30%",
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          marginBottom: "1.5rem",
          animation: "pulse 1.5s infinite",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: "5rem",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              animation: "pulse 1.5s infinite",
            }}
          />
        ))}
      </div>
      <div
        style={{
          height: "3rem",
          width: "50%",
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          marginTop: "1.5rem",
          animation: "pulse 1.5s infinite",
        }}
      />
    </div>
  );
}
