import { jsx as _jsx } from "react/jsx-runtime";
export function CssGridBlock({ props, children }) {
  const gapMap = { sm: "0.5rem", md: "1rem", lg: "2rem" };
  const gap = gapMap[props.gap ?? "md"];
  const gridTemplateColumns = `repeat(${props.columns}, 1fr)`;
  return _jsx("div", {
    style: {
      display: "grid",
      gridTemplateColumns,
      gap,
      gridAutoRows: props.minRowHeight,
    },
    children: children,
  });
}
