import type { FooterColumnsProps } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

export function FooterColumnsBlock({
  props,
}: BlockComponentProps<FooterColumnsProps>) {
  const columns = props.columns || [
    { heading: "Company", links: ["About", "Careers", "Blog"] },
    { heading: "Support", links: ["Help", "Contact", "FAQs"] },
    { heading: "Legal", links: ["Privacy", "Terms", "Cookies"] },
  ];

  return (
    <footer
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
        gap: "2rem",
        padding: "2rem 1rem",
        backgroundColor: "#1a1a2e",
        color: "#fff",
      }}
    >
      {columns.map((col, i) => (
        <div key={i}>
          <h4
            style={{
              fontSize: "0.875rem",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            {col.heading}
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {(col.links || []).map((link, j) => (
              <li key={j} style={{ marginBottom: "0.5rem" }}>
                <a
                  href="#"
                  style={{
                    color: "#bbb",
                    textDecoration: "none",
                    fontSize: "0.875rem",
                  }}
                >
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </footer>
  );
}
