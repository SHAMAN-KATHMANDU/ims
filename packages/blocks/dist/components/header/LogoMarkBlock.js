import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function LogoMarkBlock({ props }) {
  return _jsxs("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "1rem 0",
    },
    children: [
      _jsx("div", {
        style: {
          width: "40px",
          height: "40px",
          backgroundColor: "#4a90e2",
          borderRadius: "4px",
        },
      }),
      _jsx("div", {
        style: { fontSize: "1.125rem", fontWeight: 700 },
        children: props.brand || "Brand",
      }),
    ],
  });
}
