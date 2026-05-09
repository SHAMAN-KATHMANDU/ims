import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PdpDetailsBlock({ props, dataContext, }) {
    const product = dataContext.activeProduct ?? dataContext.products?.[0] ?? null;
    const sku = product?.sku ?? "—";
    const stock = product?.stock ?? 0;
    const description = product?.description ?? "";
    return (_jsxs("div", { style: {
            padding: "1.5rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            marginBlock: "1rem",
        }, children: [_jsx("h3", { style: { fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }, children: "Product Details" }), props.tabs ? (_jsxs("div", { style: {
                    display: "flex",
                    gap: "0.75rem",
                    borderBottom: "1px solid #eee",
                    marginBottom: "1rem",
                    paddingBottom: "0.5rem",
                    fontSize: "0.875rem",
                    color: "#4a90e2",
                }, children: [_jsx("span", { style: { fontWeight: 600 }, children: "Specs" }), _jsx("span", { style: { color: "#737373" }, children: "Description" }), _jsx("span", { style: { color: "#737373" }, children: "Shipping" })] })) : null, _jsxs("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    fontSize: "0.875rem",
                }, children: [_jsxs("div", { children: [_jsx("strong", { children: "SKU:" }), " ", sku] }), _jsxs("div", { children: [_jsx("strong", { children: "Availability:" }), " ", stock > 0 ? "In Stock" : "Out of Stock"] })] }), description ? (_jsx("p", { style: {
                    marginTop: "1rem",
                    fontSize: "0.875rem",
                    color: "#525252",
                    lineHeight: 1.5,
                }, children: description })) : null] }));
}
