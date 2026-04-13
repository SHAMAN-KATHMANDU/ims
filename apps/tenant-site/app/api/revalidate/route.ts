/**
 * Revalidation webhook — called by the API after mutations on /sites/* and
 * /platform/tenants/:id/website/* so visitors see fresh content within
 * seconds of a tenant clicking Publish.
 *
 * Contract:
 *   POST /api/revalidate
 *   Header: x-revalidate-secret: <shared secret>
 *   Body:   { "tags": ["tenant:acme-id:site", "tenant:acme-id:products"] }
 *
 * Response: { revalidated: number }  (count of tags processed)
 */

import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

const HEADER = "x-revalidate-secret";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: Request) {
  const expected = process.env.REVALIDATE_SECRET ?? "";
  if (!expected) {
    return NextResponse.json(
      { error: "revalidate_secret_not_configured" },
      { status: 503 },
    );
  }

  const provided = req.headers.get(HEADER) ?? "";
  if (!provided || !constantTimeEqual(provided, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { tags?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (
    !body.tags ||
    !Array.isArray(body.tags) ||
    !body.tags.every((t) => typeof t === "string")
  ) {
    return NextResponse.json(
      { error: "invalid_tags", message: "tags must be an array of strings" },
      { status: 400 },
    );
  }

  const tags = body.tags as string[];
  for (const tag of tags) {
    revalidateTag(tag);
  }

  return NextResponse.json({ revalidated: tags.length });
}
