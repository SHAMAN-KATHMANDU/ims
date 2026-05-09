import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function OrderSummaryBlock({ props, }) {
    return (_jsxs("div", { style: {
            maxWidth: "400px",
            margin: "1rem auto",
            padding: "1rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
        }, children: [_jsx("h3", { style: { fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }, children: "Order Summary" }), _jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                }, children: [_jsx("span", { children: "Subtotal" }), _jsx("span", { children: "\u2014" })] }), _jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                }, children: [_jsx("span", { children: "Shipping" }), _jsx("span", { children: "\u2014" })] }), _jsx("hr", { style: {
                    margin: "1rem 0",
                    border: "none",
                    borderTop: "1px solid #ddd",
                } }), _jsxs("div", { style: {
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "1.125rem",
                    fontWeight: 600,
                }, children: [_jsx("span", { children: "Total" }), _jsx("span", { children: "\u2014" })] })] }));
}
