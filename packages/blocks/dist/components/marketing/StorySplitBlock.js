import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StorySplitBlock({ props }) {
  return _jsxs("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "2rem",
      alignItems: "center",
      marginBlock: "1rem",
    },
    children: [
      _jsx("div", {
        style: {
          aspectRatio: "4 / 3",
          backgroundColor: "#f0f0f0",
          borderRadius: "8px",
        },
      }),
      _jsxs("div", {
        children: [
          props.eyebrow
            ? _jsx("div", {
                style: {
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: "0.5rem",
                  color: "#999",
                },
                children: props.eyebrow,
              })
            : null,
          _jsx("h2", {
            style: { fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" },
            children: props.title || "Our Story",
          }),
          _jsx("p", {
            style: { fontSize: "1rem", lineHeight: 1.6, color: "#666" },
            children: props.body || "Tell your brand story here.",
          }),
        ],
      }),
    ],
  });
}
