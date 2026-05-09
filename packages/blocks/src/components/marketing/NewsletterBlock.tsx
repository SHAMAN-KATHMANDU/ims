import type { NewsletterProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function NewsletterBlock({
  props,
}: BlockComponentProps<NewsletterProps>) {
  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "1rem auto",
        padding: "2rem",
        backgroundColor: "#f0ebe3",
        borderRadius: "8px",
        textAlign: "center",
      }}
    >
      <h3
        style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}
      >
        {props.title || "Subscribe"}
      </h3>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        {props.subtitle || "Get updates on new products"}
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="email"
          placeholder="Enter your email"
          style={{
            flex: 1,
            padding: "0.75rem",
            border: "none",
            borderRadius: "4px",
            fontSize: "1rem",
          }}
          disabled
        />
        <button
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#4a90e2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 500,
          }}
          disabled
        >
          Subscribe
        </button>
      </div>
    </div>
  );
}
