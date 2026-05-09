import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatPrice } from "../../utils/format";
export function PdpBuyboxBlock({ props, dataContext, }) {
    const { locale = "en-IN", currency = "INR" } = dataContext.site || {};
    const product = dataContext.activeProduct ?? dataContext.products?.[0] ?? null;
    const productName = product?.name ?? "Product Name";
    const productPrice = product?.price ?? 0;
    return (_jsxs("div", { style: {
            padding: "1.5rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
            marginBlock: "1rem",
        }, children: [_jsx("h1", { style: { fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }, children: productName }), _jsx("p", { style: {
                    fontSize: props.priceSize === "lg"
                        ? "1.5rem"
                        : props.priceSize === "sm"
                            ? "1rem"
                            : "1.25rem",
                    color: "#4a90e2",
                    fontWeight: 600,
                    marginBottom: "1rem",
                }, children: formatPrice(productPrice, { locale, currency }) }), props.showVariantPicker !== false && (_jsxs("div", { style: { display: "flex", gap: "0.5rem", marginBottom: "1rem" }, children: [_jsx("label", { style: { fontSize: "0.875rem" }, children: "Quantity:" }), _jsx("input", { type: "number", defaultValue: "1", min: "1", style: {
                            width: "60px",
                            padding: "0.5rem",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                        }, disabled: true })] })), props.showAddToCart !== false && (_jsx("button", { style: {
                    width: "100%",
                    padding: "1rem",
                    backgroundColor: "#4a90e2",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                }, disabled: true, children: "Add to Cart" })), _jsx("button", { style: {
                    width: "100%",
                    padding: "1rem",
                    backgroundColor: "transparent",
                    color: "#4a90e2",
                    border: "2px solid #4a90e2",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: 600,
                }, disabled: true, children: "Buy Now" })] }));
}
