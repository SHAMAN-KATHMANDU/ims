import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const DEFAULT_COLUMNS = [
    {
        title: "Company",
        links: [
            { label: "About", href: "/about" },
            { label: "Careers", href: "/careers" },
            { label: "Blog", href: "/blog" },
        ],
    },
    {
        title: "Support",
        links: [
            { label: "Help", href: "/help" },
            { label: "Contact", href: "/contact" },
            { label: "FAQs", href: "/faq" },
        ],
    },
    {
        title: "Legal",
        links: [
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
            { label: "Cookies", href: "/cookies" },
        ],
    },
];
export function FooterColumnsBlock({ props, }) {
    const columns = props.columns?.length ? props.columns : DEFAULT_COLUMNS;
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
                    }, children: col.title }), _jsx("ul", { style: { listStyle: "none", padding: 0, margin: 0 }, children: (col.links || []).map((link, j) => (_jsx("li", { style: { marginBottom: "0.5rem" }, children: _jsx("a", { href: link.href, style: {
                                color: "#bbb",
                                textDecoration: "none",
                                fontSize: "0.875rem",
                            }, children: link.label }) }, j))) })] }, i))) }));
}
