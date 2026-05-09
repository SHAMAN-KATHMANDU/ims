import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatPrice } from "../../utils/format";
export function ProductGridBlock({ props, dataContext, }) {
    const products = dataContext.products || [];
    const columns = props.columns ?? 3;
    const { locale = "en-IN", currency = "INR" } = dataContext.site || {};
    return (_jsx("div", { style: {
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: "1rem",
            marginBlock: "1rem",
        }, children: products.length === 0 ? (_jsx("div", { style: { color: "#999", fontSize: "0.875rem", gridColumn: "1 / -1" }, children: "Product Grid (no products)" })) : (products.map((product) => (_jsxs("div", { style: {
                border: "1px solid #ddd",
                borderRadius: "8px",
                overflow: "hidden",
                padding: "1rem",
            }, children: [_jsx("div", { style: {
                        aspectRatio: "1",
                        backgroundColor: "#f0f0f0",
                        borderRadius: "4px",
                        marginBottom: "1rem",
                    } }), _jsx("h3", { style: {
                        fontSize: "1rem",
                        fontWeight: 600,
                        marginBottom: "0.5rem",
                    }, children: product.name }), _jsx("p", { style: { fontSize: "1.125rem", color: "#4a90e2" }, children: formatPrice(product.price, { locale, currency }) })] }, product.id)))) }));
}
