/**
 * Checkout proxy — same-origin entry point for the guest-order POST.
 *
 * The client (`CheckoutForm.tsx`) runs in the browser and must NOT read
 * `API_INTERNAL_URL` directly — that env var has no `NEXT_PUBLIC_` prefix,
 * so Next.js strips it from the client bundle at build time and the
 * browser falls back to `http://localhost:4000/api/v1`. On a customer's
 * device that hostname isn't routable, fetch() rejects, and the checkout
 * form surfaces the generic "Could not reach the checkout service"
 * message. Been broken since checkout shipped; nobody noticed because
 * the localhost fallback happens to work in dev.
 *
 * The fix is this route: browser POSTs to the same origin (tenant-site),
 * and this server-side handler forwards to the API using the server-only
 * env var. Tenant context comes from the Host header, which the admin
 * middleware has already resolved and stashed in `x-host` / `x-tenant-id`.
 *
 * Body is passed through verbatim; the backend is the source of truth for
 * validation + pricing.
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";

const API = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const h = await headers();
  // Prefer the middleware-resolved host; fall back to the raw Host header
  // so this works even if middleware skipped this path.
  const host = h.get("x-host") ?? h.get("host") ?? "";
  if (!host) {
    return NextResponse.json(
      { message: "Missing host header" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${API}/public/orders`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        // Forward the customer-facing host so the API's
        // resolveTenantFromHostname middleware scopes the order correctly.
        host,
        "x-forwarded-host": host,
      },
      body: JSON.stringify(body),
    });

    const payload = await upstream.json().catch(() => null);
    return NextResponse.json(payload ?? {}, { status: upstream.status });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[tenant-site] /api/public/orders proxy threw", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error && error.message
            ? `Checkout upstream error: ${error.message}`
            : "Checkout upstream unreachable",
      },
      { status: 502 },
    );
  }
}
