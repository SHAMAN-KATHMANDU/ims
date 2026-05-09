import type {
  ButtonProps,
  DividerProps,
  HeadingProps,
  ImageProps,
  RichTextProps,
  SpacerProps,
} from "@repo/shared";
import type { BlockComponentProps } from "../../types";
import { normalizeImageRef } from "../../utils/image";

// Heading
const HEADING_SIZE_MAP: Record<string, string> = {
  sm: "1.25rem",
  md: "1.85rem",
  lg: "2.75rem",
  xl: "3.5rem",
};

export function HeadingBlock({ props }: BlockComponentProps<HeadingProps>) {
  const Tag = `h${props.level}` as "h1" | "h2" | "h3" | "h4";
  const size = props.size
    ? HEADING_SIZE_MAP[props.size]
    : props.level === 1
      ? "2.5rem"
      : props.level === 2
        ? "2rem"
        : props.level === 3
          ? "1.5rem"
          : "1.15rem";

  const decorationStyle: React.CSSProperties =
    props.decoration === "underline"
      ? {
          borderBottom: "3px solid #4a90e2",
          paddingBottom: "0.5rem",
          display: "inline-block",
        }
      : props.decoration === "gradient"
        ? {
            backgroundImage: "linear-gradient(135deg, #4a90e2, #f0ebe3)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }
        : {};

  return (
    <div
      style={{
        textAlign: props.alignment ?? "start",
        padding: "1rem 0",
      }}
    >
      {props.eyebrow && (
        <div
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#888",
            marginBottom: "0.6rem",
          }}
        >
          {props.eyebrow}
        </div>
      )}
      <Tag
        style={{
          fontSize: size,
          fontFamily: "georgia, serif",
          fontWeight: 600,
          lineHeight: 1.15,
          color: "#1a1a2e",
          margin: 0,
          ...decorationStyle,
        }}
      >
        {props.text}
      </Tag>
      {props.subtitle && (
        <p
          style={{
            fontSize: "1.05rem",
            color: "#666",
            marginTop: "0.75rem",
            maxWidth: 640,
            marginInline: props.alignment === "center" ? "auto" : undefined,
            lineHeight: 1.6,
          }}
        >
          {props.subtitle}
        </p>
      )}
    </div>
  );
}

// Rich Text
export function RichTextBlock({ props }: BlockComponentProps<RichTextProps>) {
  const maxWidth =
    props.maxWidth === "narrow" ? 640 : props.maxWidth === "wide" ? 1100 : 820;

  return (
    <div
      style={{
        maxWidth,
        marginInline: "auto",
        fontSize: "1rem",
        lineHeight: 1.7,
        color: "#333",
      }}
    >
      {props.source || "No content"}
    </div>
  );
}

// Image
export function ImageBlock({ props }: BlockComponentProps<ImageProps>) {
  const src = normalizeImageRef(props.src);
  const aspectRatio = props.aspectRatio ?? "16 / 9";

  return (
    <figure
      style={{
        margin: "1rem 0",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio,
          background: src
            ? `url(${src}) center / cover no-repeat`
            : "linear-gradient(135deg, #888 0%, #666 100%)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      />
      {props.caption && (
        <figcaption
          style={{
            fontSize: "0.875rem",
            color: "#666",
            marginTop: "0.5rem",
            textAlign: "center",
          }}
        >
          {props.caption}
        </figcaption>
      )}
    </figure>
  );
}

// Button
export function ButtonBlock({ props }: BlockComponentProps<ButtonProps>) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: "#4a90e2",
      color: "white",
      border: "none",
    },
    outline: {
      backgroundColor: "transparent",
      color: "#4a90e2",
      border: "2px solid #4a90e2",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "#1a1a2e",
      border: "none",
      textDecoration: "underline",
    },
  };

  const sizes: Record<string, React.CSSProperties> = {
    sm: { padding: "0.5rem 1rem", fontSize: "0.875rem" },
    md: { padding: "0.75rem 1.5rem", fontSize: "1rem" },
    lg: { padding: "1rem 2rem", fontSize: "1.125rem" },
  };

  const baseStyle: React.CSSProperties = {
    ...styles[props.style ?? "primary"],
    ...sizes[props.size ?? "md"],
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: 500,
    display: "inline-block",
    textAlign: "center",
  };

  return (
    <div
      style={{
        textAlign: props.alignment ?? "start",
        marginBlock: "1rem",
      }}
    >
      <button style={baseStyle}>{props.label}</button>
    </div>
  );
}

// Spacer
export function SpacerBlock({ props }: BlockComponentProps<SpacerProps>) {
  const sizeMap = {
    xs: "0.5rem",
    sm: "1rem",
    md: "2rem",
    lg: "3rem",
    xl: "4rem",
  };
  const height = props.customPx ? `${props.customPx}px` : sizeMap[props.size];

  return <div style={{ height }} />;
}

// Divider
export function DividerBlock({ props }: BlockComponentProps<DividerProps>) {
  const style: React.CSSProperties =
    props.variant === "dashed"
      ? {
          borderTop: "2px dashed #ddd",
        }
      : props.variant === "dotted"
        ? {
            borderTop: "2px dotted #ddd",
          }
        : {
            borderTop: "1px solid #ddd",
          };

  return (
    <hr
      style={{
        ...style,
        margin: props.inset ? "2rem 2rem" : "2rem 0",
        border: "none",
      }}
    />
  );
}
