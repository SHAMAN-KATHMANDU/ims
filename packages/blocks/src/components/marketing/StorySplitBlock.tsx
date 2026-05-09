import type { StorySplitProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function StorySplitBlock({
  props,
}: BlockComponentProps<StorySplitProps>) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "2rem",
        alignItems: "center",
        marginBlock: "1rem",
      }}
    >
      <div
        style={{
          aspectRatio: "4 / 3",
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
        }}
      />
      <div>
        {props.eyebrow ? (
          <div
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.5rem",
              color: "#999",
            }}
          >
            {props.eyebrow}
          </div>
        ) : null}
        <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>
          {props.title || "Our Story"}
        </h2>
        <p style={{ fontSize: "1rem", lineHeight: 1.6, color: "#666" }}>
          {props.body || "Tell your brand story here."}
        </p>
      </div>
    </div>
  );
}
