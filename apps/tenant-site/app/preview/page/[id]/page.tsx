/**
 * Token-gated draft preview for tenant pages.
 *
 * Bypasses the host-based tenant middleware (see middleware.ts). The page
 * fetches the draft from /api/v1/public/preview/page/:id?token=... — the
 * API verifies the HMAC token and returns the draft body + branding for
 * theme tokens. Renders inside a self-contained shell with a "PREVIEW"
 * banner; no nav / footer chrome (the V1 preview is just body + theme).
 *
 * The route is no-indexed and never cached.
 */

import type { Metadata } from "next";
import { brandingToCssVars, brandingTheme } from "@/lib/theme";
import { MarkdownBody } from "@/components/blog/MarkdownBody";

const API = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

// Drafts must never be cached.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

interface DraftPagePreviewResponse {
  page: {
    id: string;
    slug: string;
    title: string;
    bodyMarkdown: string;
    layoutVariant: string;
    seoTitle: string | null;
    seoDescription: string | null;
    isPublished: boolean;
    updatedAt: string;
  };
  branding: unknown;
}

function columnWidth(variant: string | undefined): number {
  if (variant === "full-width") return 1200;
  if (variant === "narrow") return 640;
  return 820;
}

function readToken(raw: string | string[] | undefined): string | null {
  if (!raw) return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === "string" && v.length > 0 ? v : null;
}

async function fetchDraft(
  id: string,
  token: string,
): Promise<DraftPagePreviewResponse | { error: string; status: number }> {
  try {
    const res = await fetch(
      `${API}/public/preview/page/${encodeURIComponent(id)}?token=${encodeURIComponent(
        token,
      )}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      let message = `Preview unavailable (HTTP ${res.status})`;
      try {
        const body = (await res.json()) as { message?: string };
        if (body?.message) message = body.message;
      } catch {
        // ignore
      }
      return { error: message, status: res.status };
    }
    return (await res.json()) as DraftPagePreviewResponse;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Network error",
      status: 0,
    };
  }
}

function PreviewBanner({ isPublished }: { isPublished: boolean }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#1e1e1e",
        color: "#fff",
        padding: "8px 16px",
        fontSize: 13,
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        textAlign: "center",
        letterSpacing: "0.02em",
      }}
    >
      <strong>PREVIEW</strong> — {isPublished ? "Published" : "Draft"} · changes
      save before they appear here · refresh to see latest
    </div>
  );
}

function ErrorShell({ message }: { message: string }) {
  return (
    <main
      style={{
        maxWidth: 540,
        margin: "10vh auto",
        padding: "24px",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        color: "#1e1e1e",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Preview unavailable</h1>
      <p style={{ color: "#666", fontSize: 14 }}>{message}</p>
    </main>
  );
}

export default async function PageDraftPreviewRoute({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const token = readToken(sp.token);

  if (!token) {
    return <ErrorShell message="Missing preview token in URL." />;
  }

  const result = await fetchDraft(id, token);
  if ("error" in result) {
    return <ErrorShell message={result.error} />;
  }

  const { page } = result;
  const branding =
    result.branding && typeof result.branding === "object"
      ? (result.branding as Record<string, unknown>)
      : null;
  const vars = brandingToCssVars(branding);
  const theme = brandingTheme(branding);
  const maxWidth = columnWidth(page.layoutVariant);

  return (
    <div
      data-theme={theme}
      data-page="preview-tenant-page"
      style={{
        ...(vars as React.CSSProperties),
        minHeight: "100vh",
        background: "var(--color-background, #fff)",
      }}
    >
      <PreviewBanner isPublished={page.isPublished} />
      <main
        style={{
          padding: "var(--section-padding, 64px) 24px",
          maxWidth,
          margin: "0 auto",
        }}
      >
        <article>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontFamily: "var(--font-display, var(--font-heading, inherit))",
              lineHeight: 1.15,
              marginBottom: "2rem",
              color: "var(--color-text, #111)",
            }}
          >
            {page.title}
          </h1>
          <MarkdownBody source={page.bodyMarkdown} />
        </article>
      </main>
    </div>
  );
}
