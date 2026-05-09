import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function BreadcrumbsBlock({ props }) {
  const scopeLabel = {
    product: "Product",
    category: "Category",
    page: "Page",
  }[props.scope];
  return _jsx("nav", {
    style: { marginBlock: "1rem" },
    children: _jsxs("ol", {
      style: {
        display: "flex",
        gap: "0.5rem",
        fontSize: "0.875rem",
        color: "#666",
        listStyle: "none",
        padding: 0,
        margin: 0,
      },
      children: [
        _jsx("li", {
          children: _jsx("a", {
            href: "#",
            style: { color: "#4a90e2", textDecoration: "none" },
            children: "Home",
          }),
        }),
        _jsxs("li", {
          style: { display: "flex", alignItems: "center", gap: "0.5rem" },
          children: [
            _jsx("span", { children: "/" }),
            _jsx("a", {
              href: "#",
              style: { color: "#4a90e2", textDecoration: "none" },
              children: scopeLabel,
            }),
          ],
        }),
      ],
    }),
  });
}
