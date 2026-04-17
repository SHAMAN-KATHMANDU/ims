"use client";

export default function HomeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="container"
      style={{
        padding: "var(--section-padding) 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "50vh",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(1.5rem, 3vw, 2rem)",
          fontFamily: "var(--font-display)",
          marginBottom: "0.75rem",
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          color: "var(--color-muted)",
          marginBottom: "1.5rem",
          maxWidth: 420,
          lineHeight: 1.6,
        }}
      >
        We couldn&apos;t load the page. Please try again in a moment.
      </p>
      <button onClick={reset} className="btn">
        Try again
      </button>
    </div>
  );
}
