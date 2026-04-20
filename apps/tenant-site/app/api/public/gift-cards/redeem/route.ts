/**
 * Gift card redeem proxy — same-origin entry point for the redeem block.
 *
 * Mirrors /api/public/orders: the browser cannot read API_INTERNAL_URL
 * (stripped from the client bundle), so the redeem form POSTs same-origin
 * and this handler forwards to the API with the Host header preserved so
 * the backend's resolveTenantFromHostname middleware scopes the lookup.
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";

const API = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const h = await headers();
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
    const upstream = await fetch(`${API}/public/gift-cards/redeem`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        host,
        "x-forwarded-host": host,
      },
      body: JSON.stringify(body),
    });
    const payload = await upstream.json().catch(() => null);
    return NextResponse.json(payload ?? {}, { status: upstream.status });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      "[tenant-site] /api/public/gift-cards/redeem proxy threw",
      error,
    );
    return NextResponse.json(
      { message: "Redeem upstream unreachable" },
      { status: 502 },
    );
  }
}
