/**
 * fbt block — Frequently Bought Together.
 *
 * Server-renders a grid of products co-purchased with the anchor product
 * within the backend's FBT window. Returns null when no co-purchase data
 * exists yet (new stores, cold start) so the PDP composition stays clean.
 */

import type { FbtProps } from "@repo/shared";
import { getFrequentlyBoughtWith } from "@/lib/api";
import { ProductGrid } from "@/components/templates/shared";
import type { BlockComponentProps } from "../registry";

export async function FbtBlock({
  node,
  props,
  dataContext,
}: BlockComponentProps<FbtProps>) {
  const source = props.productIdSource ?? "current-pdp";
  const productId =
    source === "explicit" ? props.productId : dataContext.activeProduct?.id;
  if (!productId) return null;

  const products = await getFrequentlyBoughtWith(
    dataContext.host,
    dataContext.tenantId,
    productId,
  );
  const limit = props.limit ?? 4;
  const slice = products.slice(0, limit);
  if (slice.length === 0) return null;

  const wrapperHasPadY = node.style?.paddingY !== undefined;
  return (
    <section
      style={{
        padding: wrapperHasPadY ? undefined : "var(--section-padding) 0",
      }}
    >
      <div className="container">
        <h2
          style={{
            fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
            fontFamily: "var(--font-display)",
            marginBottom: "2rem",
            textAlign: "center",
          }}
        >
          {props.heading ?? "Frequently bought together"}
        </h2>
        <ProductGrid
          products={slice}
          columns={props.columns ?? 4}
          variant={props.cardVariant ?? "bordered"}
        />
      </div>
    </section>
  );
}
