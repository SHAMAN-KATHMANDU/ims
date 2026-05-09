import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
export function CopyrightBarBlock({ props }) {
  const year = new Date().getFullYear();
  return _jsx("div", {
    style: {
      textAlign: "center",
      padding: "1.5rem",
      backgroundColor: "#000",
      color: "#999",
      fontSize: "0.875rem",
      borderTop: "1px solid #333",
    },
    children: _jsxs("p", {
      style: { margin: 0 },
      children: ["\u00A9 ", year, " ", props.copy || "All rights reserved."],
    }),
  });
}
