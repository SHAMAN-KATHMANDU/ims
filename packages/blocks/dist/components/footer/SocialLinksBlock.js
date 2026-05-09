import { jsx as _jsx } from "react/jsx-runtime";
export function SocialLinksBlock({ props, }) {
    const items = props.items || [
        { platform: "facebook", href: "#" },
        { platform: "twitter", href: "#" },
        { platform: "instagram", href: "#" },
    ];
    return (_jsx("div", { style: {
            display: "flex",
            gap: "1rem",
            justifyContent: props.align === "center"
                ? "center"
                : props.align === "end"
                    ? "flex-end"
                    : "flex-start",
            padding: "1rem",
        }, children: items.map((item, i) => (_jsx("a", { href: item.href, style: {
                width: "40px",
                height: "40px",
                backgroundColor: "#ddd",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                color: "#666",
            }, children: item.platform?.[0]?.toUpperCase() }, i))) }));
}
