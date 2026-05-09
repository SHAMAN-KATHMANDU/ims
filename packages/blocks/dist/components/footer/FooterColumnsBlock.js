import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function FooterColumnsBlock({ props, }) {
    const columns = props.columns || [
        { heading: "Company", links: ["About", "Careers", "Blog"] },
        { heading: "Support", links: ["Help", "Contact", "FAQs"] },
        { heading: "Legal", links: ["Privacy", "Terms", "Cookies"] },
    ];
    return (_jsx("footer", { style: {
            display: "grid",
            gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
            gap: "2rem",
            padding: "2rem 1rem",
            backgroundColor: "#1a1a2e",
            color: "#fff",
        }, children: columns.map((col, i) => (_jsxs("div", { children: [_jsx("h4", { style: {
                        fontSize: "0.875rem",
                        textTransform: "uppercase",
                        marginBottom: "1rem",
                    }, children: col.heading }), _jsx("ul", { style: { listStyle: "none", padding: 0, margin: 0 }, children: (col.links || []).map((link, j) => (_jsx("li", { style: { marginBottom: "0.5rem" }, children: _jsx("a", { href: "#", style: {
                                color: "#bbb",
                                textDecoration: "none",
                                fontSize: "0.875rem",
                            }, children: link }) }, j))) })] }, i))) }));
}
