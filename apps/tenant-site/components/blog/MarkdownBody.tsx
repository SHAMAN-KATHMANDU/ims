/**
 * Safe markdown renderer for tenant-authored blog bodies.
 *
 * Stack:
 *   - react-markdown for MD → HTML
 *   - remark-gfm for tables / strikethrough / task lists
 *   - rehype-slug + rehype-autolink-headings for anchor links (TOC friendly)
 *   - rehype-sanitize with the default safe schema — tenants never get raw
 *     HTML passthrough, and any <script>, <iframe>, inline event handler,
 *     etc., is stripped at render time. Belt-and-suspenders: the editor
 *     only stores markdown, not HTML, so this is a defense-in-depth layer.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize from "rehype-sanitize";

export function MarkdownBody({ source }: { source: string }) {
  return (
    <div className="blog-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "wrap" }],
          rehypeSanitize,
        ]}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
