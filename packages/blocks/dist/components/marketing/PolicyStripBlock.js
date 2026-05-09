import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PolicyStripBlock({ props, }) {
    const items = props.items ?? [];
    return (_jsxs("div", { style: {
            padding: "1.5rem",
            backgroundColor: props.dark ? "#1a1a1a" : "#f0f0f0",
            color: props.dark ? "#fafafa" : "#1a1a1a",
            borderRadius: "8px",
            marginBlock: "1rem",
        }, children: [props.heading ? (_jsx("h3", { style: { fontSize: "1rem", fontWeight: 600, marginBottom: "1rem" }, children: props.heading })) : null, _jsx("div", { style: {
                    display: props.layout === "grid" ? "grid" : "flex",
                    gridTemplateColumns: props.layout === "grid"
                        ? `repeat(${props.columns ?? 3}, 1fr)`
                        : undefined,
                    flexWrap: "wrap",
                    gap: "1rem",
                }, children: items.length === 0 ? (_jsx("span", { style: { color: "#999", fontSize: "0.875rem" }, children: "Policy strip \u2014 add items" })) : (items.map((item, i) => (_jsxs("div", { style: { fontSize: "0.875rem", lineHeight: 1.5 }, children: [_jsx("strong", { children: item.label }), item.detail ? (_jsx("div", { style: { opacity: 0.7 }, children: item.detail })) : null] }, i)))) })] }));
}
