import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function UtilityBarBlock({ props, }) {
    return (_jsxs("div", { style: {
            display: "flex",
            justifyContent: "flex-end",
            gap: "1.5rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#f9f9f9",
            fontSize: "0.875rem",
        }, children: [_jsx("a", { href: "#", style: {
                    color: "#666",
                    textDecoration: "none",
                }, children: "Account" }), _jsx("a", { href: "#", style: {
                    color: "#666",
                    textDecoration: "none",
                }, children: "Cart (0)" }), _jsx("a", { href: "#", style: {
                    color: "#666",
                    textDecoration: "none",
                }, children: "Search" })] }));
}
