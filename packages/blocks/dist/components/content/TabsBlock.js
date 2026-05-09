import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function TabsBlock({ props }) {
    const tabs = props.tabs ?? [];
    return (_jsxs("div", { style: { marginBlock: "1rem" }, children: [_jsx("div", { style: {
                    display: "flex",
                    gap: "1rem",
                    borderBottom: "1px solid #ddd",
                    marginBottom: "1rem",
                }, children: tabs.length === 0 ? (_jsx("div", { style: { color: "#999", fontSize: "0.875rem" }, children: "Tabs (no tabs configured)" })) : (tabs.map((tab, i) => (_jsx("button", { style: {
                        background: "none",
                        border: "none",
                        paddingBottom: "1rem",
                        fontSize: "1rem",
                        cursor: "pointer",
                        borderBottom: i === 0 ? "2px solid #4a90e2" : "none",
                        color: i === 0 ? "#4a90e2" : "#666",
                    }, children: tab.label || "Tab" }, i)))) }), tabs[0] && (_jsx("div", { style: { fontSize: "0.875rem", color: "#666" }, children: tabs[0].content || "Content" }))] }));
}
