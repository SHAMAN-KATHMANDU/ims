import Link from "next/link";

export default function CollectionNotFound() {
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
        Collection not found
      </h1>
      <p
        style={{
          color: "var(--color-muted)",
          marginBottom: "1.5rem",
          maxWidth: 420,
          lineHeight: 1.6,
        }}
      >
        This collection may have been removed or is no longer active.
      </p>
      <Link href="/products" className="btn">
        Browse products
      </Link>
    </div>
  );
}
