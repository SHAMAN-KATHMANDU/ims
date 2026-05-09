import type { NavBarProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function NavBarBlock({
  props,
  dataContext,
}: BlockComponentProps<NavBarProps>) {
  const navPages = dataContext.navPages || [];

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem",
        backgroundColor: "#fff",
        borderBottom: "1px solid #ddd",
      }}
    >
      <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
        {typeof props.brand === "string"
          ? props.brand
          : props.brand?.text || "Logo"}
      </div>
      <div style={{ display: "flex", gap: "2rem" }}>
        {navPages.map((page) => (
          <a
            key={page.id}
            href={page.slug}
            style={{
              color: "#333",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            {page.name}
          </a>
        ))}
      </div>
      <button
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#4a90e2",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
        disabled
      >
        Contact
      </button>
    </nav>
  );
}
