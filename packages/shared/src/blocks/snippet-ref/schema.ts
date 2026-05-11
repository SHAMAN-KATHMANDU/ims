import { z } from "zod";

const optStr = (max: number) => z.string().trim().max(max).optional();

/**
 * Snippet reference — a pointer to a SiteSnippet (Phase 5). The
 * tenant-site renderer dereferences `snippetId` at request time and
 * recurses through the standard BlockRenderer with the snippet's body.
 *
 * `fallbackTitle` is shown by the admin editor when the referenced
 * snippet is missing or the renderer hits a cycle/depth-limit. It also
 * doubles as the title rendered above the snippet on the public site
 * when the tenant wants to caption the embed (purely visual).
 */
export interface SnippetRefProps {
  snippetId: string;
  fallbackTitle?: string;
}

export const SnippetRefSchema = z
  .object({
    // min(0) so a freshly-dropped snippet-ref from the palette validates
    // before the user picks a snippet via the inspector.
    snippetId: z.string().min(0).max(80),
    fallbackTitle: optStr(160),
  })
  .strict();

export type SnippetRefInput = z.infer<typeof SnippetRefSchema>;
