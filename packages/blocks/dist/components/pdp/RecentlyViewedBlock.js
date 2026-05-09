import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function RecentlyViewedBlock({ props, dataContext }) {
  const products = dataContext.products || [];
  return _jsxs("div", {
    style: { marginBlock: "1rem" },
    children: [
      _jsx("h3", {
        style: { fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" },
        children: "Recently Viewed",
      }),
      _jsx("div", {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "1rem",
        },
        children: products.slice(0, 5).map((product) =>
          _jsx(
            "div",
            {
              style: {
                aspectRatio: "1",
                backgroundColor: "#f0f0f0",
                borderRadius: "8px",
              },
            },
            product.id,
          ),
        ),
      }),
    ],
  });
}
