import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function ContactBlockComp({ props, }) {
    return (_jsxs("div", { style: {
            maxWidth: "600px",
            margin: "1rem auto",
            padding: "2rem",
            border: "1px solid #ddd",
            borderRadius: "8px",
        }, children: [_jsx("h3", { style: { fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }, children: props.heading || "Get in Touch" }), _jsxs("form", { style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                }, children: [_jsx("input", { type: "text", placeholder: "Name", style: {
                            padding: "0.75rem",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "1rem",
                        }, disabled: true }), _jsx("input", { type: "email", placeholder: "Email", style: {
                            padding: "0.75rem",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "1rem",
                        }, disabled: true }), _jsx("textarea", { placeholder: "Message", rows: 4, style: {
                            padding: "0.75rem",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            fontSize: "1rem",
                        }, disabled: true }), _jsx("button", { style: {
                            padding: "0.75rem",
                            backgroundColor: "#4a90e2",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: 500,
                        }, disabled: true, children: "Send" })] })] }));
}
