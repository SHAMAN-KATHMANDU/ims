import type { ColumnsProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function ColumnsBlock({
  props,
  children,
}: BlockComponentProps<ColumnsProps>) {
  const gapMap = { sm: "0.5rem", md: "1rem", lg: "2rem" };
  const gap = gapMap[props.gap ?? "md"];
  const columns = props.count ?? 2;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
      }}
    >
      {children}
    </div>
  );
}
