/**
 * blocksToMarkdown — emit a markdown approximation of a BlockNode tree.
 *
 * Used server-side to keep the BlogPost / TenantPage `bodyMarkdown` column
 * in sync with the canonical block tree on every save. The resulting
 * markdown drives RSS feeds, plain-text fallbacks, and any consumer that
 * predates the block model.
 *
 * Coverage is intentionally narrow:
 *   - Lossy by design — the block tree is the source of truth, markdown is
 *     a derived projection.
 *   - Only kinds that have a clean markdown analog emit content. Everything
 *     else (commerce, PDP, header/footer, layout containers without text)
 *     contributes nothing to the output.
 *   - Container kinds (section, columns, row, css-grid) recurse into their
 *     children so nested text still renders.
 *
 * Pure function. No side effects. Safe to call from API services and
 * Edge runtimes.
 */

import type { BlockNode, BlockKind } from "../site-schema/blocks";

interface MinimalBlock {
  kind: string;
  props?: unknown;
  children?: MinimalBlock[];
}

/**
 * Serialise a block tree into a single markdown string. Blocks are joined
 * with a blank line between them; trailing whitespace is trimmed.
 */
export function blocksToMarkdown(blocks: ReadonlyArray<BlockNode>): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";
  const out: string[] = [];
  for (const block of blocks) {
    const md = blockToMarkdown(block as MinimalBlock);
    if (md) out.push(md);
  }
  return out.join("\n\n").trim();
}

/**
 * Per-block dispatcher. Exported for testability; consumers should prefer
 * the array form.
 */
export function blockToMarkdown(block: MinimalBlock): string {
  if (!block || typeof block !== "object") return "";
  const kind = block.kind as BlockKind;
  const props = (block.props ?? {}) as Record<string, unknown>;

  switch (kind) {
    case "heading":
      return serializeHeading(props);
    case "rich-text":
      return serializeRichText(props);
    case "markdown-body":
      return serializeMarkdownBody(props);
    case "image":
      return serializeImage(props);
    case "divider":
      return "---";
    case "accordion":
      return serializeAccordion(props);
    case "faq":
      return serializeFaq(props);
    case "testimonials":
      return serializeTestimonials(props);
    case "embed":
    case "video":
      return serializeEmbed(props);
    case "button":
      return serializeButton(props);
    case "spacer":
      return "";
    // Container kinds — recurse into children.
    case "section":
    case "columns":
    case "css-grid":
    case "row":
      return serializeContainer(block);
    default:
      // Unknown / non-text kinds (commerce, PDP, header/footer): contribute
      // nothing. Recurse into children regardless so authors who wrap text
      // in odd containers still see it in the markdown projection.
      return serializeContainer(block);
  }
}

// ---------------------------------------------------------------------------
// Per-kind serialisers (private)
// ---------------------------------------------------------------------------

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function clampHeadingLevel(n: number): number {
  if (n < 1) return 1;
  if (n > 6) return 6;
  return Math.floor(n);
}

function serializeHeading(props: Record<string, unknown>): string {
  const text = asString(props.text).trim();
  if (!text) return "";
  const level = clampHeadingLevel(asNumber(props.level, 2));
  const eyebrow = asString(props.eyebrow).trim();
  const subtitle = asString(props.subtitle).trim();
  const lines: string[] = [];
  if (eyebrow) lines.push(`_${eyebrow}_`);
  lines.push(`${"#".repeat(level)} ${text}`);
  if (subtitle) lines.push(subtitle);
  return lines.join("\n\n");
}

function serializeRichText(props: Record<string, unknown>): string {
  const source = asString(props.source).trim();
  return source;
}

function serializeMarkdownBody(props: Record<string, unknown>): string {
  return asString(props.source).trim();
}

function serializeImage(props: Record<string, unknown>): string {
  const src = asString(props.src).trim();
  if (!src) return "";
  const alt = asString(props.alt) || "";
  const caption = asString(props.caption).trim();
  const md = `![${alt}](${src})`;
  return caption ? `${md}\n\n_${caption}_` : md;
}

function serializeAccordion(props: Record<string, unknown>): string {
  const heading = asString(props.heading).trim();
  const items = Array.isArray(props.items) ? props.items : [];
  const lines: string[] = [];
  if (heading) lines.push(`## ${heading}`);
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const title = asString(item.title).trim();
    const body = asString(item.body).trim();
    if (!title && !body) continue;
    if (title) lines.push(`### ${title}`);
    if (body) lines.push(body);
  }
  return lines.join("\n\n");
}

function serializeFaq(props: Record<string, unknown>): string {
  const heading = asString(props.heading).trim();
  const items = Array.isArray(props.items) ? props.items : [];
  const lines: string[] = [];
  if (heading) lines.push(`## ${heading}`);
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const question = asString(item.question).trim();
    const answer = asString(item.answer).trim();
    if (!question && !answer) continue;
    if (question) lines.push(`**${question}**`);
    if (answer) lines.push(answer);
  }
  return lines.join("\n\n");
}

function serializeTestimonials(props: Record<string, unknown>): string {
  const heading = asString(props.heading).trim();
  const items = Array.isArray(props.items) ? props.items : [];
  const lines: string[] = [];
  if (heading) lines.push(`## ${heading}`);
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const quote = asString(item.quote).trim();
    const author = asString(item.author).trim();
    if (!quote) continue;
    const attribution = author ? ` — ${author}` : "";
    lines.push(`> ${quote}${attribution}`);
  }
  return lines.join("\n\n");
}

function serializeEmbed(props: Record<string, unknown>): string {
  const url = asString(props.src || props.url).trim();
  if (!url) return "";
  return `<${url}>`;
}

function serializeButton(props: Record<string, unknown>): string {
  const label = asString(props.label).trim();
  const href = asString(props.href).trim();
  if (!label) return "";
  return href ? `[${label}](${href})` : label;
}

function serializeContainer(block: MinimalBlock): string {
  if (!Array.isArray(block.children) || block.children.length === 0) return "";
  const out: string[] = [];
  for (const child of block.children) {
    const md = blockToMarkdown(child);
    if (md) out.push(md);
  }
  return out.join("\n\n");
}
