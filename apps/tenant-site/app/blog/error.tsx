"use client";

export default function BlogError({
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
        minHeight: "40vh",
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
        Couldn&apos;t load the journal
      </h1>
      <p
        style={{
          color: "var(--color-muted)",
          marginBottom: "1.5rem",
          maxWidth: 420,
          lineHeight: 1.6,
        }}
      >
        Something went wrong while fetching posts. Please try again.
      </p>
      <button onClick={reset} className="btn">
        Try again
      </button>
    </div>
  );
}
