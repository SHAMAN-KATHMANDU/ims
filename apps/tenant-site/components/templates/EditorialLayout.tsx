import { getTenantContext } from "@/lib/tenant";
import type { TemplateProps } from "./types";
import Link from "next/link";
import {
  SiteHeader,
  Hero,
  ProductGrid,
  ProductDetail,
  ContactBlock,
  SiteFooter,
  StorySplit,
  CategoryTiles,
} from "./shared";
import { FeaturedBlogSection } from "@/components/blog/FeaturedBlogSection";
import { formatPrice, getSiteFormatOptions } from "@/lib/format";

/**
 * EDITORIAL — Magazine-style. Serif display, asymmetric newspaper grid
 * on the homepage (big feature + supporting products), story section
 * front and center, category tiles with an editorial eyebrow. For
 * brands that want to feel like a print publication.
 */
export async function EditorialLayout(props: TemplateProps) {
  const ctx = await getTenantContext();
  const {
    page,
    site,
    products,
    categories,
    navPages,
    sections,
    activeProduct,
    featuredBlogPosts,
  } = props;

  const [lead, ...rest] = products;
  const formatOpts = getSiteFormatOptions(site);

  return (
    <div data-template="editorial">
      <SiteHeader
        site={site}
        host={ctx.host}
        categories={categories}
        navPages={navPages}
        variant="centered"
      />

      {page === "home" && (
        <>
          {sections.hero && (
            <Hero
              site={site}
              host={ctx.host}
              variant="editorial"
              ctaLabel="Read the issue"
              ctaHref="/blog"
            />
          )}

          {sections.products && lead && (
            <section
              style={{
                padding: "var(--section-padding) 0",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <div className="container">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "2.5rem",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "var(--color-muted)",
                        marginBottom: "0.35rem",
                      }}
                    >
                      Issue {new Date().getFullYear()} · №{" "}
                      {new Date().getMonth() + 1}
                    </div>
                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)",
                        margin: 0,
                        fontWeight: 400,
                        fontStyle: "italic",
                      }}
                    >
                      The cover story
                    </h2>
                  </div>
                  <Link
                    href="/products"
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--color-muted)",
                    }}
                  >
                    All stories →
                  </Link>
                </div>

                <div
                  className="tpl-stack"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: "3rem",
                    alignItems: "start",
                    borderTop: "1px solid var(--color-border)",
                    paddingTop: "2.5rem",
                  }}
                >
                  <Link
                    href={`/products/${lead.id}`}
                    style={{ display: "block", color: "var(--color-text)" }}
                  >
                    <div
                      style={{
                        aspectRatio: "16/10",
                        background: "var(--color-surface)",
                        borderRadius: "var(--radius)",
                        marginBottom: "1.5rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-muted)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {lead.imsCode}
                    </div>
                    <div
                      style={{
                        fontSize: "clamp(1.5rem, 2vw, 2rem)",
                        fontFamily: "var(--font-display)",
                        marginBottom: "0.5rem",
                        lineHeight: 1.2,
                      }}
                    >
                      {lead.name}
                    </div>
                    {lead.description && (
                      <p
                        style={{
                          color: "var(--color-muted)",
                          lineHeight: 1.7,
                          maxWidth: 540,
                        }}
                      >
                        {lead.description.length > 220
                          ? `${lead.description.slice(0, 220).trim()}…`
                          : lead.description}
                      </p>
                    )}
                  </Link>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.5rem",
                    }}
                  >
                    {rest.slice(0, 4).map((p) => (
                      <Link
                        key={p.id}
                        href={`/products/${p.id}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "80px 1fr",
                          gap: "1rem",
                          color: "var(--color-text)",
                          paddingBottom: "1.25rem",
                          borderBottom: "1px solid var(--color-border)",
                        }}
                      >
                        <div
                          style={{
                            aspectRatio: "1/1",
                            background: "var(--color-surface)",
                            borderRadius: "var(--radius)",
                          }}
                        />
                        <div>
                          <div
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: "1rem",
                              lineHeight: 1.3,
                              marginBottom: "0.25rem",
                            }}
                          >
                            {p.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--color-muted)",
                            }}
                          >
                            {formatPrice(p.finalSp, formatOpts)}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {sections.story && (
            <StorySplit
              eyebrow="The story behind the story"
              title="A product is only half the letter."
              body={`Every piece in this shop comes from somewhere — a workshop, a material, a moment. The people who make them, the place they come from, the hands that touch them at each stage. That's the other half, and we think it's worth reading.

We publish a short piece with every launch. No ads, no upsells, just the story.`}
              imageSide="right"
              cta={{ href: "/blog", label: "Read the journal" }}
            />
          )}

          {sections.categories && (
            <CategoryTiles
              categories={categories}
              columns={3}
              heading="Departments"
            />
          )}

          {sections.products && (
            <section
              style={{
                padding: "var(--section-padding) 0",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <div className="container">
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)",
                    marginBottom: "2.5rem",
                    fontStyle: "italic",
                    fontWeight: 400,
                  }}
                >
                  On the shelves
                </h2>
                <ProductGrid
                  products={products}
                  columns={3}
                  variant="bare"
                  formatOpts={formatOpts}
                />
              </div>
            </section>
          )}

          {sections.articles && (
            <FeaturedBlogSection posts={featuredBlogPosts ?? []} />
          )}

          {sections.contact && <ContactBlock site={site} />}
        </>
      )}

      {page === "products" && (
        <section style={{ padding: "var(--section-padding) 0" }}>
          <div className="container">
            <h1
              style={{
                fontSize: "clamp(2.25rem, 4vw, 3rem)",
                marginBottom: "3rem",
                fontFamily: "var(--font-display)",
                fontStyle: "italic",
                fontWeight: 400,
              }}
            >
              The index
            </h1>
            <ProductGrid
              products={products}
              columns={3}
              variant="bare"
              formatOpts={formatOpts}
            />
          </div>
        </section>
      )}

      {page === "product" && activeProduct && (
        <ProductDetail product={activeProduct} formatOpts={formatOpts} />
      )}

      {page === "contact" && <ContactBlock site={site} />}

      <SiteFooter site={site} host={ctx.host} navPages={navPages} />
    </div>
  );
}
