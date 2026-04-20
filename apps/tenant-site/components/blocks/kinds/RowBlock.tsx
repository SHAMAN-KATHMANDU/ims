import type { RowProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";

const GAP_MAP: Record<string, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

const JUSTIFY_MAP: Record<string, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

const ALIGN_MAP: Record<string, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

export function RowBlock({ props, children }: BlockComponentProps<RowProps>) {
  const classes = [
    "flex",
    props.reverse ? "flex-row-reverse" : "flex-row",
    props.wrap ? "flex-wrap" : "flex-nowrap",
    props.gap ? (GAP_MAP[props.gap] ?? "gap-4") : "gap-4",
    props.justify ? (JUSTIFY_MAP[props.justify] ?? "") : "",
    props.align ? (ALIGN_MAP[props.align] ?? "") : "",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}
