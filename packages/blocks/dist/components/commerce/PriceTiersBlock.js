import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PriceTiersBlock({ props, }) {
    return (_jsx("div", { style: {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1rem",
            marginBlock: "1rem",
        }, children: [
            { label: "Tier 1", price: "—" },
            { label: "Tier 2", price: "—" },
            { label: "Tier 3", price: "—" },
        ].map((tier, i) => (_jsxs("div", { style: {
                padding: "1rem",
                border: i === 1 ? "2px solid #4a90e2" : "1px solid #ddd",
                borderRadius: "8px",
                textAlign: "center",
            }, children: [_jsx("h4", { style: {
                        fontSize: "1rem",
                        fontWeight: 600,
                        marginBottom: "0.5rem",
                    }, children: tier.label }), _jsx("p", { style: { fontSize: "1.5rem", color: "#4a90e2", margin: 0 }, children: tier.price })] }, i))) }));
}
