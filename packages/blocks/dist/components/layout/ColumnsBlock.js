import { jsx as _jsx } from "react/jsx-runtime";
export function ColumnsBlock({ props, children, }) {
    const gapMap = { sm: "0.5rem", md: "1rem", lg: "2rem" };
    const gap = gapMap[props.gap ?? "md"];
    const columns = props.count ?? 2;
    return (_jsx("div", { style: {
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap,
        }, children: children }));
}
