import { jsx as _jsx } from "react/jsx-runtime";
export function CategoryTilesBlock({ props, dataContext, }) {
    const categories = dataContext.categories || [];
    const columns = props.columns ?? 3;
    return (_jsx("div", { style: {
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: "1rem",
            marginBlock: "1rem",
        }, children: categories.length === 0 ? (_jsx("div", { style: { color: "#999", fontSize: "0.875rem", gridColumn: "1 / -1" }, children: "Category Tiles (no categories)" })) : (categories.map((cat) => (_jsx("div", { style: {
                position: "relative",
                aspectRatio: "1",
                backgroundColor: "#f0f0f0",
                borderRadius: "8px",
                overflow: "hidden",
                display: "flex",
                alignItems: "flex-end",
                padding: "1rem",
                cursor: "pointer",
            }, children: _jsx("h3", { style: {
                    color: "#fff",
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                }, children: cat.name }) }, cat.id)))) }));
}
