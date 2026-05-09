import type { ReviewsListProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function ReviewsListBlock({
  props,
}: BlockComponentProps<ReviewsListProps>) {
  return (
    <div
      style={{
        marginBlock: "1rem",
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h3
        style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}
      >
        Customer Reviews
      </h3>
      <div
        style={{
          backgroundColor: "#f9f9f9",
          padding: "1rem",
          borderRadius: "4px",
          textAlign: "center",
          color: "#999",
          fontSize: "0.875rem",
        }}
      >
        No reviews yet
      </div>
    </div>
  );
}
