import { jsx as _jsx } from "react/jsx-runtime";
export function RowBlock({ props, children }) {
  const gapMap = {
    none: "0",
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  };
  const gap = gapMap[props.gap ?? "md"];
  const justifyMap = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    between: "space-between",
    around: "space-around",
    evenly: "space-evenly",
  };
  const alignMap = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    stretch: "stretch",
  };
  return _jsx("div", {
    style: {
      display: "flex",
      gap,
      alignItems: alignMap[props.align ?? "stretch"],
      justifyContent: justifyMap[props.justify ?? "start"],
      flexWrap: props.wrap ? "wrap" : "nowrap",
      flexDirection: props.reverse ? "row-reverse" : "row",
    },
    children: children,
  });
}
