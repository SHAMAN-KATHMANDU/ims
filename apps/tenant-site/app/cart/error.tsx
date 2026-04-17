"use client";

export default function CartError({
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
        We couldn&apos;t load your cart. Your saved items are safe &mdash;
        please try again.
      </p>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <button onClick={reset} className="btn">
          Try again
        </button>
        <a href="/products" className="btn btn-outline">
          Browse products
        </a>
      </div>
    </div>
  );
}
