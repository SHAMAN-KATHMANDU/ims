/**
 * Form submission proxy — same-origin entry for the form block.
 *
 * The form block submits here from the browser; this handler forwards to
 * a backend endpoint (or stores locally if no backend route exists yet).
 * For now, we forward to the existing /public/orders-style pattern: the
 * backend will need a /public/form-submissions endpoint. Until that's
 * wired, this route stores nothing and returns a success stub so the
 * form UX works end-to-end during development.
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";

const API = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const h = await headers();
  const host = h.get("x-host") ?? h.get("host") ?? "";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${API}/public/form-submissions`, {
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
    console.error("[tenant-site] form-submissions proxy threw", error);
    return NextResponse.json({ message: "Submission failed" }, { status: 502 });
  }
}
