/**
 * recently-viewed block — client-side localStorage recall strip.
 *
 * Server wrapper extracts only the JSON-safe fields it needs from the
 * active product and hands them to the client reader below. The reader
 * both (1) pushes the current product into the queue on mount and
 * (2) renders the queue — so a single block instance covers tracking +
 * display. PDP pages without this block on the layout will not track,
 * which is fine: other blueprints can include it or we can add a silent
 * tracker in a later pass.
 */

import type { RecentlyViewedProps } from "@repo/shared";
import type { BlockComponentProps } from "../registry";
import { RecentlyViewedClient } from "./RecentlyViewedClient";

export function RecentlyViewedBlock({
  node,
  props,
  dataContext,
}: BlockComponentProps<RecentlyViewedProps>) {
  const active = dataContext.activeProduct ?? null;
  const currentSummary = active
    ? {
        id: active.id,
        name: active.name,
        photoUrl: active.photoUrl ?? null,
        finalSp: active.finalSp,
        mrp: active.mrp,
        categoryName: active.category?.name ?? null,
      }
    : null;
  const wrapperHasPadY = node.style?.paddingY !== undefined;
  return (
    <RecentlyViewedClient
      heading={props.heading}
      limit={props.limit ?? 4}
      columns={props.columns ?? 4}
      hideWhenEmpty={props.hideWhenEmpty ?? true}
      excludeCurrent={props.excludeCurrent ?? true}
      currentSummary={currentSummary}
      wrapperHasPadY={wrapperHasPadY}
    />
  );
}
