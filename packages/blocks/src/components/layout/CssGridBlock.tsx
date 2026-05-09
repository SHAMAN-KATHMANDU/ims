import type { CssGridProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function CssGridBlock({
  props,
  children,
}: BlockComponentProps<CssGridProps>) {
  const gapMap = { sm: "0.5rem", md: "1rem", lg: "2rem" };
  const gap = gapMap[props.gap ?? "md"];
  const gridTemplateColumns = `repeat(${props.columns}, 1fr)`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns,
        gap,
        gridAutoRows: props.minRowHeight,
      }}
    >
      {children}
    </div>
  );
}
