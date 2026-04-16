export default function Loading() {
  return (
    <div className="container" style={{ padding: "var(--section-padding) 0" }}>
      <div
        style={{
          height: "2rem",
          width: "40%",
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          marginBottom: "1rem",
          animation: "pulse 1.5s infinite",
        }}
      />
      <div
        style={{
          height: "1rem",
          width: "60%",
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          marginBottom: "2rem",
          animation: "pulse 1.5s infinite",
        }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              aspectRatio: "3/4",
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
