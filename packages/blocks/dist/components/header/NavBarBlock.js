import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function NavBarBlock({ props, dataContext, }) {
    const navPages = dataContext.navPages || [];
    return (_jsxs("nav", { style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1rem",
            backgroundColor: "#fff",
            borderBottom: "1px solid #ddd",
        }, children: [_jsx("div", { style: { fontSize: "1.25rem", fontWeight: 700 }, children: typeof props.brand === "string"
                    ? props.brand
                    : props.brand?.text || "Logo" }), _jsx("div", { style: { display: "flex", gap: "2rem" }, children: navPages.map((page) => (_jsx("a", { href: page.slug, style: {
                        color: "#333",
                        textDecoration: "none",
                        fontSize: "0.875rem",
                    }, children: page.name }, page.id))) }), _jsx("button", { style: {
                    padding: "0.5rem 1rem",
                    backgroundColor: "#4a90e2",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                }, disabled: true, children: "Contact" })] }));
}
