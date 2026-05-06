/**
 * SnippetRefBlock — server component that dereferences a `snippet-ref`
 * block and renders the referenced SiteSnippet's body inline.
 *
 * Cycle protection:
 *   - The dataContext carries a `snippetDepth` counter (default 0).
 *   - Each render bumps the counter when recursing; if the counter
 *     reaches MAX_DEPTH we render the fallback title (or nothing) and
 *     stop. Three levels is plenty for normal use and small enough to
 *     keep the request graph cheap.
 *
 * Caching:
 *   - The snippet fetch lives in a Next.js `fetch()` with a tenant-tagged
 *     revalidate — `tenant:{id}:snippets` invalidates every published
 *     edit (sites.revalidate flushes this tag).
 */

import { getSnippetById } from "@/lib/api";
import type { SnippetRefProps, BlockNode } from "@repo/shared";
import type { BlockComponentProps } from "../registry";
import { BlockRenderer } from "../BlockRenderer";

const MAX_SNIPPET_DEPTH = 3;

interface SnippetDataCtx {
  snippetDepth?: number;
}

export async function SnippetRefBlock({
  props,
  dataContext,
}: BlockComponentProps<SnippetRefProps>) {
  const ctx = dataContext as unknown as typeof dataContext & SnippetDataCtx;
  const depth = ctx.snippetDepth ?? 0;
  if (depth >= MAX_SNIPPET_DEPTH) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        `[SnippetRefBlock] depth limit (${MAX_SNIPPET_DEPTH}) reached for snippet ${props.snippetId}`,
      );
    }
    return props.fallbackTitle ? (
      <div data-snippet-fallback>{props.fallbackTitle}</div>
    ) : null;
  }

  if (!props.snippetId) return null;

  const host = dataContext.host;
  const tenantId = dataContext.tenantId;
  const snippet = await getSnippetById(host, tenantId, props.snippetId);
  if (!snippet) {
    if (props.fallbackTitle) {
      return <div data-snippet-fallback>{props.fallbackTitle}</div>;
    }
    return null;
  }

  // Bump depth for the nested render so any inner `snippet-ref` blocks
  // see one less depth budget.
  const innerDataContext = {
    ...dataContext,
    snippetDepth: depth + 1,
  };

  const body = (snippet.body ?? []) as BlockNode[];
  return <BlockRenderer nodes={body} dataContext={innerDataContext} />;
}
