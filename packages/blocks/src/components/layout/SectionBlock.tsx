import type { SectionProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

const SECTION_PADDING: Record<NonNullable<SectionProps["paddingY"]>, string> = {
  none: "0",
  compact: "2.5rem 0",
  balanced: "4rem 0",
  spacious: "7rem 0",
};

const SECTION_MAX_WIDTH: Record<
  NonNullable<SectionProps["maxWidth"]>,
  number | string
> = {
  narrow: 640,
  default: 1200,
  wide: 1440,
  full: "100%",
};

const SECTION_BG: Record<NonNullable<SectionProps["background"]>, string> = {
  default: "#ffffff",
  surface: "#f5f5f5",
  accent: "#f0ebe3",
  inverted: "#1a1a2e",
};

export function SectionBlock({
  node,
  props,
  children,
}: BlockComponentProps<SectionProps>) {
  const padding = SECTION_PADDING[props.paddingY ?? "balanced"];
  const maxWidth = SECTION_MAX_WIDTH[props.maxWidth ?? "default"];
  const background = SECTION_BG[props.background ?? "default"];
  const color = props.background === "inverted" ? "#ffffff" : "#1a1a2e";

  return (
    <section
      style={{
        padding,
        background,
        color,
      }}
    >
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          paddingInline: "1rem",
        }}
      >
        {children}
      </div>
    </section>
  );
}
