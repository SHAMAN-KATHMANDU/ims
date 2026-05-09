import type { ContactBlockProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function ContactBlockComp({
  props,
}: BlockComponentProps<ContactBlockProps>) {
  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "1rem auto",
        padding: "2rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h3 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>
        {props.heading || "Get in Touch"}
      </h3>
      <form
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <input
          type="text"
          placeholder="Name"
          style={{
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "1rem",
          }}
          disabled
        />
        <input
          type="email"
          placeholder="Email"
          style={{
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "1rem",
          }}
          disabled
        />
        <textarea
          placeholder="Message"
          rows={4}
          style={{
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "1rem",
          }}
          disabled
        />
        <button
          style={{
            padding: "0.75rem",
            backgroundColor: "#4a90e2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 500,
          }}
          disabled
        >
          Send
        </button>
      </form>
    </div>
  );
}
