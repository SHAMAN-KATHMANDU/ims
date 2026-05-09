import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ProductComparisonBlock({ props, dataContext, }) {
    const products = dataContext.products || [];
    return (_jsxs("div", { style: { marginBlock: "1rem", overflowX: "auto" }, children: [_jsx("h3", { style: { fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }, children: "Compare Products" }), _jsxs("table", { style: {
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.875rem",
                }, children: [_jsx("thead", { children: _jsxs("tr", { style: { borderBottom: "2px solid #ddd" }, children: [_jsx("th", { style: { padding: "0.5rem", textAlign: "left" }, children: "Feature" }), products.slice(0, 3).map((p) => (_jsx("th", { style: { padding: "0.5rem", textAlign: "left" }, children: p.name }, p.id)))] }) }), _jsx("tbody", { children: ["Price", "Availability", "Rating"].map((feature) => (_jsxs("tr", { style: { borderBottom: "1px solid #ddd" }, children: [_jsx("td", { style: { padding: "0.5rem" }, children: feature }), products.slice(0, 3).map((p) => (_jsx("td", { style: { padding: "0.5rem" }, children: "\u2014" }, p.id)))] }, feature))) })] })] }));
}
