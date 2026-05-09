import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function LogoCloudBlock({ props }) {
  const logos = props.logos || [];
  return _jsxs("div", {
    style: {
      padding: "2rem 1rem",
      backgroundColor: "#f9f9f9",
      borderRadius: "8px",
      marginBlock: "1rem",
    },
    children: [
      _jsx("h3", {
        style: {
          textAlign: "center",
          fontSize: "0.875rem",
          color: "#999",
          marginBottom: "1rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        },
        children: props.heading || "Trusted by",
      }),
      _jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: `repeat(${props.columns || 5}, 1fr)`,
          gap: "1rem",
          alignItems: "center",
        },
        children:
          logos.length === 0
            ? [1, 2, 3, 4, 5].map((i) =>
                _jsx(
                  "div",
                  {
                    style: {
                      height: "40px",
                      backgroundColor: "#ddd",
                      borderRadius: "4px",
                    },
                  },
                  i,
                ),
              )
            : logos.map((logo, i) =>
                _jsx(
                  "div",
                  {
                    style: {
                      height: "40px",
                      backgroundColor: "#ddd",
                      borderRadius: "4px",
                    },
                  },
                  i,
                ),
              ),
      }),
    ],
  });
}
