import type { BentoShowcaseProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function BentoShowcaseBlock({
  props,
}: BlockComponentProps<BentoShowcaseProps>) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1rem",
        marginBlock: "1rem",
      }}
    >
      {[{ span: 2 }, { span: 1 }, { span: 1 }, { span: 1 }, { span: 1 }].map(
        (item, i) => (
          <div
            key={i}
            style={{
              gridColumn: `span ${item.span}`,
              aspectRatio: item.span === 2 ? "2" : "1",
              backgroundColor: "#f0f0f0",
              borderRadius: "8px",
            }}
          />
        ),
      )}
    </div>
  );
}
