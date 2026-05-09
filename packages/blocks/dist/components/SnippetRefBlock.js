import { jsxs as _jsxs } from "react/jsx-runtime";
export function SnippetRefBlock({ props }) {
  return _jsxs("div", {
    style: {
      padding: "1rem",
      backgroundColor: "#f0f0f0",
      borderRadius: "4px",
      border: "2px dashed #ccc",
      color: "#999",
      fontSize: "0.875rem",
      textAlign: "center",
      marginBlock: "1rem",
    },
    children: ["Snippet Ref: ", props.snippetId || "not set"],
  });
}
