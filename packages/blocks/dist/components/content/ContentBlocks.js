import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { normalizeImageRef } from "../../utils/image";
// Heading
const HEADING_SIZE_MAP = {
    sm: "1.25rem",
    md: "1.85rem",
    lg: "2.75rem",
    xl: "3.5rem",
};
export function HeadingBlock({ props }) {
    const Tag = `h${props.level}`;
    const size = props.size
        ? HEADING_SIZE_MAP[props.size]
        : props.level === 1
            ? "2.5rem"
            : props.level === 2
                ? "2rem"
                : props.level === 3
                    ? "1.5rem"
                    : "1.15rem";
    const decorationStyle = props.decoration === "underline"
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
    return (_jsxs("div", { style: {
            textAlign: props.alignment ?? "start",
            padding: "1rem 0",
        }, children: [props.eyebrow && (_jsx("div", { style: {
                    fontSize: "0.72rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#888",
                    marginBottom: "0.6rem",
                }, children: props.eyebrow })), _jsx(Tag, { style: {
                    fontSize: size,
                    fontFamily: "georgia, serif",
                    fontWeight: 600,
                    lineHeight: 1.15,
                    color: "#1a1a2e",
                    margin: 0,
                    ...decorationStyle,
                }, children: props.text }), props.subtitle && (_jsx("p", { style: {
                    fontSize: "1.05rem",
                    color: "#666",
                    marginTop: "0.75rem",
                    maxWidth: 640,
                    marginInline: props.alignment === "center" ? "auto" : undefined,
                    lineHeight: 1.6,
                }, children: props.subtitle }))] }));
}
// Rich Text
export function RichTextBlock({ props }) {
    const maxWidth = props.maxWidth === "narrow" ? 640 : props.maxWidth === "wide" ? 1100 : 820;
    return (_jsx("div", { style: {
            maxWidth,
            marginInline: "auto",
            fontSize: "1rem",
            lineHeight: 1.7,
            color: "#333",
        }, children: props.source || "No content" }));
}
// Image
export function ImageBlock({ props }) {
    const src = normalizeImageRef(props.src);
    const aspectRatio = props.aspectRatio ?? "16 / 9";
    return (_jsxs("figure", { style: {
            margin: "1rem 0",
        }, children: [_jsx("div", { style: {
                    width: "100%",
                    aspectRatio,
                    background: src
                        ? `url(${src}) center / cover no-repeat`
                        : "linear-gradient(135deg, #888 0%, #666 100%)",
                    borderRadius: "8px",
                    overflow: "hidden",
                } }), props.caption && (_jsx("figcaption", { style: {
                    fontSize: "0.875rem",
                    color: "#666",
                    marginTop: "0.5rem",
                    textAlign: "center",
                }, children: props.caption }))] }));
}
// Button
export function ButtonBlock({ props }) {
    const styles = {
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
    const sizes = {
        sm: { padding: "0.5rem 1rem", fontSize: "0.875rem" },
        md: { padding: "0.75rem 1.5rem", fontSize: "1rem" },
        lg: { padding: "1rem 2rem", fontSize: "1.125rem" },
    };
    const baseStyle = {
        ...styles[props.style ?? "primary"],
        ...sizes[props.size ?? "md"],
        borderRadius: "4px",
        cursor: "pointer",
        fontWeight: 500,
        display: "inline-block",
        textAlign: "center",
    };
    return (_jsx("div", { style: {
            textAlign: props.alignment ?? "start",
            marginBlock: "1rem",
        }, children: _jsx("button", { style: baseStyle, children: props.label }) }));
}
// Spacer
export function SpacerBlock({ props }) {
    const sizeMap = {
        xs: "0.5rem",
        sm: "1rem",
        md: "2rem",
        lg: "3rem",
        xl: "4rem",
    };
    const height = props.customPx ? `${props.customPx}px` : sizeMap[props.size];
    return _jsx("div", { style: { height } });
}
// Divider
export function DividerBlock({ props }) {
    const style = props.variant === "dashed"
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
    return (_jsx("hr", { style: {
            ...style,
            margin: props.inset ? "2rem 2rem" : "2rem 0",
            border: "none",
        } }));
}
