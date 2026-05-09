import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function BundleSpotlightBlock({ props, dataContext, }) {
    const { locale = "en-IN", currency = "INR" } = dataContext.site || {};
    return (_jsxs("div", { style: {
            padding: "2rem",
            backgroundColor: "#f0ebe3",
            borderRadius: "8px",
            textAlign: "center",
            marginBlock: "1rem",
        }, children: [_jsx("h2", { style: { fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }, children: props.heading || "Bundle Deal" }), _jsx("p", { style: { color: "#666", marginBottom: "1rem" }, children: props.description || "Special offer on bundled products" }), _jsxs("p", { style: { fontSize: "1.5rem", color: "#4a90e2", fontWeight: 600 }, children: ["Bundle: ", props.slug] })] }));
}
