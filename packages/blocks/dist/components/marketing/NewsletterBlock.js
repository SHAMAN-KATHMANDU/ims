import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function NewsletterBlock({ props }) {
  return _jsxs("div", {
    style: {
      maxWidth: "600px",
      margin: "1rem auto",
      padding: "2rem",
      backgroundColor: "#f0ebe3",
      borderRadius: "8px",
      textAlign: "center",
    },
    children: [
      _jsx("h3", {
        style: { fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" },
        children: props.title || "Subscribe",
      }),
      _jsx("p", {
        style: { color: "#666", marginBottom: "1.5rem" },
        children: props.subtitle || "Get updates on new products",
      }),
      _jsxs("div", {
        style: { display: "flex", gap: "0.5rem" },
        children: [
          _jsx("input", {
            type: "email",
            placeholder: "Enter your email",
            style: {
              flex: 1,
              padding: "0.75rem",
              border: "none",
              borderRadius: "4px",
              fontSize: "1rem",
            },
            disabled: true,
          }),
          _jsx("button", {
            style: {
              padding: "0.75rem 1.5rem",
              backgroundColor: "#4a90e2",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 500,
            },
            disabled: true,
            children: "Subscribe",
          }),
        ],
      }),
    ],
  });
}
