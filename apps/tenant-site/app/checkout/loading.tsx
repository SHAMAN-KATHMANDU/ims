export default function Loading() {
  return (
    <div className="container" style={{ padding: "var(--section-padding) 0" }}>
      <div
        className="tpl-stack"
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "2.5rem",
          alignItems: "start",
        }}
      >
        {/* Form skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              height: "2.5rem",
              width: "40%",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              animation: "pulse 1.5s infinite",
            }}
          />
          <div
            style={{
              height: "1rem",
              width: "70%",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              animation: "pulse 1.5s infinite",
            }}
          />
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              <div
                style={{
                  height: "0.85rem",
                  width: "20%",
                  background: "var(--color-surface)",
                  borderRadius: "var(--radius)",
                  animation: "pulse 1.5s infinite",
                }}
              />
              <div
                style={{
                  height: "3rem",
                  background: "var(--color-surface)",
                  borderRadius: "var(--radius)",
                  animation: "pulse 1.5s infinite",
                }}
              />
            </div>
          ))}
          <div
            style={{
              height: "3rem",
              width: "100%",
              background: "var(--color-surface)",
              borderRadius: "var(--radius)",
              marginTop: "0.75rem",
              animation: "pulse 1.5s infinite",
            }}
          />
        </div>

        {/* Order summary skeleton */}
        <div
          style={{
            padding: "1.5rem",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius)",
            background: "var(--color-surface)",
          }}
        >
          <div
            style={{
              height: "0.85rem",
              width: "50%",
              background: "var(--color-border)",
              borderRadius: "var(--radius)",
              marginBottom: "1rem",
              animation: "pulse 1.5s infinite",
            }}
          />
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.5rem",
              }}
            >
              <div
                style={{
                  height: "1rem",
                  width: "55%",
                  background: "var(--color-border)",
                  borderRadius: "var(--radius)",
                  animation: "pulse 1.5s infinite",
                }}
              />
              <div
                style={{
                  height: "1rem",
                  width: "25%",
                  background: "var(--color-border)",
                  borderRadius: "var(--radius)",
                  animation: "pulse 1.5s infinite",
                }}
              />
            </div>
          ))}
          <div
            style={{
              borderTop: "1px solid var(--color-border)",
              paddingTop: "0.75rem",
              marginTop: "0.5rem",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                height: "1.1rem",
                width: "30%",
                background: "var(--color-border)",
                borderRadius: "var(--radius)",
                animation: "pulse 1.5s infinite",
              }}
            />
            <div
              style={{
                height: "1.1rem",
                width: "25%",
                background: "var(--color-border)",
                borderRadius: "var(--radius)",
                animation: "pulse 1.5s infinite",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
