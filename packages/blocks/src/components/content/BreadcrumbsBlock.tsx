import type { BreadcrumbsProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function BreadcrumbsBlock({
  props,
}: BlockComponentProps<BreadcrumbsProps>) {
  const scopeLabel = {
    product: "Product",
    category: "Category",
    page: "Page",
  }[props.scope];

  return (
    <nav style={{ marginBlock: "1rem" }}>
      <ol
        style={{
          display: "flex",
          gap: "0.5rem",
          fontSize: "0.875rem",
          color: "#666",
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        <li>
          <a href="#" style={{ color: "#4a90e2", textDecoration: "none" }}>
            Home
          </a>
        </li>
        <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>/</span>
          <a href="#" style={{ color: "#4a90e2", textDecoration: "none" }}>
            {scopeLabel}
          </a>
        </li>
      </ol>
    </nav>
  );
}
