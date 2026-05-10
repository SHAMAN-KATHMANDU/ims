import type { NavBarProps, NavBarItem } from "@repo/shared";
import type { BlockComponentProps } from "../../types";

/**
 * Resolve which nav items to render. Priority order:
 *   1. dataContext.site.navigation.primary — editor-managed (Navigation tab),
 *      synthesized on Apply by `seedNavigationFromBlueprint`. Single source
 *      of truth across every header instance.
 *   2. props.items — the block's own override; populated when a tenant
 *      explicitly opts out of site nav (Phase 1 inspector toggle).
 *   3. dataContext.navPages — backward compatibility for tenants who
 *      haven't re-applied a template since the navigation column was
 *      introduced; renders the legacy nav-pages list so chrome isn't
 *      empty pre-migration.
 */
function resolveItems(
  props: NavBarProps,
  dataContext: BlockComponentProps<NavBarProps>["dataContext"],
): Array<{ label: string; href: string }> {
  const sitePrimary = dataContext?.site?.navigation?.primary;
  if (Array.isArray(sitePrimary) && sitePrimary.length > 0) {
    return sitePrimary.map((item) => ({ label: item.label, href: item.href }));
  }
  if (Array.isArray(props.items) && props.items.length > 0) {
    return props.items.map((item: NavBarItem) => ({
      label: item.label,
      href: item.href,
    }));
  }
  const navPages = dataContext?.navPages ?? [];
  return navPages.map((page) => ({
    label: page.name,
    href: page.slug.startsWith("/") ? page.slug : `/${page.slug}`,
  }));
}

export function NavBarBlock({
  props,
  dataContext,
}: BlockComponentProps<NavBarProps>) {
  const items = resolveItems(props, dataContext);
  const brandText =
    typeof props.brand === "string"
      ? props.brand
      : (props.brand?.text ?? "Brand");
  const brandHref = props.brandHref ?? "/";

  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1rem 1.5rem",
        backgroundColor: "var(--tb-color-surface, #fff)",
        borderBottom: "1px solid var(--tb-color-border, #e5e7eb)",
        position: props.sticky ? "sticky" : undefined,
        top: props.sticky ? 0 : undefined,
        zIndex: props.sticky ? 10 : undefined,
      }}
    >
      <a
        href={brandHref}
        style={{
          fontSize: "1.25rem",
          fontWeight: 700,
          color: "var(--tb-color-text, #111)",
          textDecoration: "none",
        }}
      >
        {brandText}
      </a>
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
        {items.map((item) => (
          <a
            key={`${item.href}-${item.label}`}
            href={item.href}
            style={{
              color: "var(--tb-color-text, #333)",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
      {props.cta ? (
        <a
          href={props.cta.href}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor:
              props.cta.style === "primary"
                ? "var(--tb-color-primary, #4a90e2)"
                : "transparent",
            color:
              props.cta.style === "primary"
                ? "#fff"
                : "var(--tb-color-primary, #4a90e2)",
            border:
              props.cta.style === "outline"
                ? "1px solid var(--tb-color-primary, #4a90e2)"
                : "none",
            borderRadius: "4px",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          {props.cta.label}
        </a>
      ) : null}
    </nav>
  );
}
