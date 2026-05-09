import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PdpRelatedBlock({ props, dataContext }) {
  const products = dataContext.products || [];
  return _jsxs("div", {
    style: { marginBlock: "1rem" },
    children: [
      _jsx("h3", {
        style: { fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" },
        children: "Related Products",
      }),
      _jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "1rem",
        },
        children: products.slice(0, 4).map((product) =>
          _jsxs(
            "div",
            {
              style: {
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "1rem",
              },
              children: [
                _jsx("div", {
                  style: {
                    aspectRatio: "1",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "4px",
                    marginBottom: "0.5rem",
                  },
                }),
                _jsx("h4", {
                  style: { fontSize: "0.875rem", margin: 0 },
                  children: product.name,
                }),
              ],
            },
            product.id,
          ),
        ),
      }),
    ],
  });
}
