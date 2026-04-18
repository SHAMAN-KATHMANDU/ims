/**
 * reviews-list block — APPROVED customer reviews for a product.
 *
 * Server-renders the first page via getProductReviews. Defaults to the
 * active PDP product but also accepts an explicit productId for landing
 * pages that promote a specific item. Returns null when there are no
 * reviews and no emptyMessage — the PDP composition stays clean for
 * products without social proof yet.
 */

import type { ReviewsListProps } from "@repo/shared";
import { getProductReviews } from "@/lib/api";
import type { BlockComponentProps } from "../registry";
import { StarRating } from "./StarRating";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function ReviewsListBlock({
  node,
  props,
  dataContext,
}: BlockComponentProps<ReviewsListProps>) {
  const source = props.productIdSource ?? "current-pdp";
  const productId =
    source === "explicit" ? props.productId : dataContext.activeProduct?.id;
  if (!productId) return null;

  const pageSize = props.pageSize ?? 10;
  const payload = await getProductReviews(
    dataContext.host,
    dataContext.tenantId,
    productId,
    1,
    pageSize,
  );
  const reviews = payload?.reviews ?? [];
  const total = payload?.total ?? 0;

  if (reviews.length === 0 && !props.emptyMessage) return null;

  const wrapperHasPadY = node.style?.paddingY !== undefined;
  const activeProduct =
    source === "current-pdp" ? dataContext.activeProduct : null;
  const showSummary =
    props.showRatingSummary !== false &&
    activeProduct?.avgRating != null &&
    activeProduct.ratingCount != null &&
    activeProduct.ratingCount > 0;

  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
      <div className="container" style={{ maxWidth: 820 }}>
        {props.heading && (
          <h2
            style={{
              fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
              fontFamily: "var(--font-display)",
              marginBottom: "1.5rem",
            }}
          >
            {props.heading}
          </h2>
        )}

        {showSummary && activeProduct && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "2rem",
              paddingBottom: "1.5rem",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <StarRating value={activeProduct.avgRating ?? 0} size="lg" />
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: 600,
                color: "var(--color-text)",
              }}
            >
              {(activeProduct.avgRating ?? 0).toFixed(1)}
            </div>
            <div
              style={{
                fontSize: "0.88rem",
                color: "var(--color-muted)",
              }}
            >
              ({activeProduct.ratingCount}{" "}
              {activeProduct.ratingCount === 1 ? "review" : "reviews"})
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <p
            style={{
              color: "var(--color-muted)",
              fontSize: "0.95rem",
              lineHeight: 1.6,
            }}
          >
            {props.emptyMessage}
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {reviews.map((review) => (
              <li
                key={review.id}
                style={{
                  paddingBottom: "1.5rem",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.6rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <StarRating value={review.rating} size="sm" />
                  {review.authorName && (
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        color: "var(--color-text)",
                      }}
                    >
                      {review.authorName}
                    </span>
                  )}
                  <time
                    dateTime={review.createdAt}
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--color-muted)",
                    }}
                  >
                    {formatDate(review.createdAt)}
                  </time>
                </div>
                {review.body && (
                  <p
                    style={{
                      margin: 0,
                      lineHeight: 1.6,
                      color: "var(--color-text)",
                      opacity: 0.9,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {review.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {total > reviews.length && (
          <p
            style={{
              marginTop: "1.5rem",
              fontSize: "0.82rem",
              color: "var(--color-muted)",
            }}
          >
            Showing {reviews.length} of {total} reviews
          </p>
        )}
      </div>
    </section>
  );
}
