import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function EmptyStateBlock({ props }) {
  return _jsxs("div", {
    style: {
      padding: "3rem 1rem",
      textAlign: "center",
      backgroundColor: "#f9f9f9",
      borderRadius: "8px",
      marginBlock: "1rem",
    },
    children: [
      _jsx("div", {
        style: {
          fontSize: "2rem",
          marginBottom: "1rem",
        },
        children: props.illustration !== "none" ? "∅" : "",
      }),
      _jsx("h3", {
        style: {
          fontSize: "1.25rem",
          color: "#1a1a2e",
          marginBottom: "0.5rem",
        },
        children: props.heading || "Nothing here",
      }),
      props.subtitle &&
        _jsx("p", {
          style: { color: "#666", marginBottom: "1rem" },
          children: props.subtitle,
        }),
    ],
  });
}
