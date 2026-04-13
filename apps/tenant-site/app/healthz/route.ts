/**
 * Container healthcheck endpoint. Bypassed by middleware (no tenant
 * resolution) so the docker healthcheck works before any host DNS is
 * configured.
 */
export async function GET() {
  return new Response("ok", {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}
