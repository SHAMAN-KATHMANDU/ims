import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function AccountBarBlock({ props, }) {
    return (_jsxs("div", { style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.5rem",
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            marginBlock: "1rem",
        }, children: [_jsxs("div", { children: [_jsx("p", { style: { margin: 0, fontSize: "0.875rem", color: "#666" }, children: "Logged in as" }), _jsx("p", { style: { margin: 0, fontSize: "1rem", fontWeight: 600 }, children: "user@example.com" })] }), _jsx("button", { style: {
                    padding: "0.5rem 1rem",
                    backgroundColor: "transparent",
                    color: "#4a90e2",
                    border: "2px solid #4a90e2",
                    borderRadius: "4px",
                    cursor: "pointer",
                }, disabled: true, children: "Switch Account" })] }));
}
