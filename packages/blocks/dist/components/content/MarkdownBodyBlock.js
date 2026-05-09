import { jsx as _jsx } from "react/jsx-runtime";
export function MarkdownBodyBlock({ props }) {
  return _jsx("div", {
    style: {
      fontSize: "1rem",
      lineHeight: 1.7,
      color: "#333",
    },
    children: _jsx("pre", {
      style: { whiteSpace: "pre-wrap", wordWrap: "break-word" },
      children: props.source || "Markdown content here",
    }),
  });
}
