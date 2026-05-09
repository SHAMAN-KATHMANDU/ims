import type { BundleSpotlightProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";
import { formatPrice } from "../../utils/format";

export function BundleSpotlightBlock({
  props,
  dataContext,
}: BlockComponentProps<BundleSpotlightProps>) {
  const { locale = "en-IN", currency = "INR" } = dataContext.site || {};

  return (
    <div
      style={{
        padding: "2rem",
        backgroundColor: "#f0ebe3",
        borderRadius: "8px",
        textAlign: "center",
        marginBlock: "1rem",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
        {props.heading || "Bundle Deal"}
      </h2>
      <p style={{ color: "#666", marginBottom: "1rem" }}>
        {props.description || "Special offer on bundled products"}
      </p>
      <p style={{ fontSize: "1.5rem", color: "#4a90e2", fontWeight: 600 }}>
        Bundle: {props.slug}
      </p>
    </div>
  );
}
