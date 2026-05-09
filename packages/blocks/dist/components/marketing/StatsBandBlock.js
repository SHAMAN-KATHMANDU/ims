import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StatsBandBlock({ props }) {
    const stats = props.items && props.items.length > 0
        ? props.items
        : [
            { value: "1M+", label: "Customers" },
            { value: "500+", label: "Products" },
            { value: "99%", label: "Satisfied" },
        ];
    return (_jsx("div", { style: {
            display: "grid",
            gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
            gap: "2rem",
            padding: "2rem",
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            textAlign: "center",
            marginBlock: "1rem",
        }, children: stats.map((stat, i) => (_jsxs("div", { children: [_jsx("div", { style: { fontSize: "2.5rem", fontWeight: 700, color: "#4a90e2" }, children: stat.value }), _jsx("div", { style: { fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }, children: stat.label })] }, i))) }));
}
