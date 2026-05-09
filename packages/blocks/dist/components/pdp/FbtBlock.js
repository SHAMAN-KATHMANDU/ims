import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function FbtBlock({ props, dataContext }) {
  const products = dataContext.products || [];
  return _jsxs("div", {
    style: { marginBlock: "1rem" },
    children: [
      _jsx("h3", {
        style: { fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" },
        children: "Frequently Bought Together",
      }),
      _jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
        },
        children: products.slice(0, 3).map((product) =>
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
                _jsx("p", {
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
