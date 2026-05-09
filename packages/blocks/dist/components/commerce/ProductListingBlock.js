import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatPrice } from "../../utils/format";
export function ProductListingBlock({ props, dataContext }) {
  const products = dataContext.products || [];
  const { locale = "en-IN", currency = "INR" } = dataContext.site || {};
  return _jsx("div", {
    style: { marginBlock: "1rem" },
    children:
      products.length === 0
        ? _jsx("div", {
            style: { color: "#999", fontSize: "0.875rem" },
            children: "Product Listing (no products)",
          })
        : products.map((product) =>
            _jsxs(
              "div",
              {
                style: {
                  display: "flex",
                  gap: "1rem",
                  borderBottom: "1px solid #ddd",
                  paddingBlock: "1rem",
                },
                children: [
                  _jsx("div", {
                    style: {
                      width: "100px",
                      height: "100px",
                      backgroundColor: "#f0f0f0",
                      borderRadius: "4px",
                      flexShrink: 0,
                    },
                  }),
                  _jsxs("div", {
                    style: { flex: 1 },
                    children: [
                      _jsx("h3", {
                        style: { fontSize: "1rem", fontWeight: 600, margin: 0 },
                        children: product.name,
                      }),
                      _jsx("p", {
                        style: {
                          fontSize: "1.125rem",
                          color: "#4a90e2",
                          margin: "0.5rem 0 0 0",
                        },
                        children: formatPrice(product.price, {
                          locale,
                          currency,
                        }),
                      }),
                    ],
                  }),
                ],
              },
              product.id,
            ),
          ),
  });
}
