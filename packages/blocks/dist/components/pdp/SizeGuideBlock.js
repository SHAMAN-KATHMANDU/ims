import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function SizeGuideBlock({ props }) {
  return _jsxs("div", {
    style: {
      marginBlock: "1rem",
      padding: "1rem",
      border: "1px solid #ddd",
      borderRadius: "8px",
    },
    children: [
      _jsx("h3", {
        style: { fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" },
        children: "Size Guide",
      }),
      _jsxs("table", {
        style: {
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.875rem",
        },
        children: [
          _jsx("thead", {
            children: _jsxs("tr", {
              style: { borderBottom: "2px solid #ddd" },
              children: [
                _jsx("th", {
                  style: { padding: "0.5rem", textAlign: "left" },
                  children: "Size",
                }),
                _jsx("th", {
                  style: { padding: "0.5rem", textAlign: "left" },
                  children: "Width",
                }),
                _jsx("th", {
                  style: { padding: "0.5rem", textAlign: "left" },
                  children: "Length",
                }),
              ],
            }),
          }),
          _jsx("tbody", {
            children: ["XS", "S", "M", "L", "XL"].map((size) =>
              _jsxs(
                "tr",
                {
                  style: { borderBottom: "1px solid #ddd" },
                  children: [
                    _jsx("td", {
                      style: { padding: "0.5rem" },
                      children: size,
                    }),
                    _jsx("td", {
                      style: { padding: "0.5rem" },
                      children: "\u2014",
                    }),
                    _jsx("td", {
                      style: { padding: "0.5rem" },
                      children: "\u2014",
                    }),
                  ],
                },
                size,
              ),
            ),
          }),
        ],
      }),
    ],
  });
}
