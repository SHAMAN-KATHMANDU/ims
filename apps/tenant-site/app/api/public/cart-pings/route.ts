/**
 * Cart-ping proxy — same-origin entry for the abandoned-cart heartbeat.
 * See sibling route `/api/public/orders/route.ts` for the rationale; the
 * short version is: CartProvider runs in the browser, so it can't read
 * `API_INTERNAL_URL` directly, so the heartbeat has been silently failing
 * in production since the cart ping shipped. Fire-and-forget semantics
 * masked the failure — this fix restores the heartbeat without any
 * client-side changes beyond the relative URL.
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";

const API = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const h = await headers();
  const host = h.get("x-host") ?? h.get("host") ?? "";
  if (!host) {
    return new NextResponse(null, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const upstream = await fetch(`${API}/public/cart-pings`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        host,
        "x-forwarded-host": host,
      },
      body: JSON.stringify(body),
    });
    // Cart pings are fire-and-forget — return the upstream status but
    // don't bother with the body (upstream returns 204 on success).
    return new NextResponse(null, { status: upstream.status });
  } catch {
    // Swallow — CartProvider treats any non-OK as a dropped heartbeat and
    // retries on the next mutation.
    return new NextResponse(null, { status: 502 });
  }
}
