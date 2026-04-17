export default function Loading() {
  return (
    <div
      className="container"
      style={{
        padding: "var(--section-padding) 0",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          height: "2.5rem",
          width: "35%",
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          marginBottom: "1rem",
          animation: "pulse 1.5s infinite",
        }}
      />
      <div
        style={{
          height: "1rem",
          width: "65%",
          background: "var(--color-surface)",
          borderRadius: "var(--radius)",
          marginBottom: "2rem",
          animation: "pulse 1.5s infinite",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: "3rem",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              animation: "pulse 1.5s infinite",
            }}
          />
        ))}
        <div
          style={{
            height: "6rem",
            background: "var(--color-surface)",
            borderRadius: "var(--radius)",
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    </div>
  );
}
