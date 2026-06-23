/**
 * Thin Facebook Graph API client.
 *
 * A single low-level request helper used by both the Meta settings module
 * (credential test-connection) and the read-only MCP tools. Mirrors the
 * native-`fetch` style already used in providers/messenger.provider.ts, but
 * adds: appsecret_proof, a normalized error envelope, transient-error retry
 * with backoff, cursor/time pagination, and an insights window guard.
 *
 * It holds NO credentials and NO tenant logic — callers pass a resolved token
 * (+ optional appSecret) explicitly. Token resolution lives in
 * meta-graph.token-resolver.ts.
 */

import crypto from "crypto";
import { createError, type AppError } from "@/middlewares/errorHandler";
import { logger } from "@/config/logger";

/** Current default. Latest stable is v25.0 (Feb 2026); kept conservative and
 * overridable per tenant via MetaIntegration.graphApiVersion. */
export const DEFAULT_GRAPH_API_VERSION = "v23.0";

const GRAPH_BASE = "https://graph.facebook.com";

/** Transient Graph error codes worth retrying (API unknown/service/throttle). */
const TRANSIENT_FB_CODES = new Set([1, 2, 4, 17, 341, 368]);

/** Max page/post insights window Meta allows for since/until (90 days). */
export const MAX_INSIGHTS_WINDOW_DAYS = 90;

type QueryValue = string | number | boolean | undefined | null;

export interface GraphRequestOptions {
  path: string; // e.g. "{page-id}/insights" or "me/adaccounts" (no leading slash)
  token: string;
  appSecret?: string;
  version?: string;
  method?: "GET" | "POST";
  query?: Record<string, QueryValue>;
  /** Number of retries on transient errors (default 2 → up to 3 attempts). */
  maxRetries?: number;
}

/** Shape of Facebook's error envelope. */
interface FbError {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
  fbtrace_id?: string;
}

/** appsecret_proof = HMAC-SHA256(access_token, app_secret), hex-encoded. */
export function computeAppSecretProof(
  token: string,
  appSecret: string,
): string {
  return crypto.createHmac("sha256", appSecret).update(token).digest("hex");
}

function buildUrl(opts: GraphRequestOptions): string {
  const version = opts.version || DEFAULT_GRAPH_API_VERSION;
  const cleanPath = opts.path.replace(/^\/+/, "");
  const url = new URL(`${GRAPH_BASE}/${version}/${cleanPath}`);

  for (const [key, value] of Object.entries(opts.query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  url.searchParams.set("access_token", opts.token);
  if (opts.appSecret) {
    url.searchParams.set(
      "appsecret_proof",
      computeAppSecretProof(opts.token, opts.appSecret),
    );
  }
  return url.toString();
}

/** Map a Facebook error envelope to an AppError, preserving useful detail. */
function toAppError(httpStatus: number, fb: FbError | undefined): AppError {
  const human =
    fb?.error_user_msg || fb?.message || "Facebook Graph request failed";
  const parts = [human];
  if (fb?.code !== undefined) {
    parts.push(
      `(code ${fb.code}${fb.error_subcode ? `/${fb.error_subcode}` : ""}${
        fb.type ? `, ${fb.type}` : ""
      })`,
    );
  }
  if (fb?.fbtrace_id) parts.push(`[fbtrace_id: ${fb.fbtrace_id}]`);

  // Map common permanent codes to friendlier HTTP statuses; otherwise mirror HTTP.
  let statusCode = httpStatus || 502;
  if (fb?.code === 190)
    statusCode = 401; // invalid/expired token
  else if (fb?.code === 200 || fb?.code === 10 || fb?.code === 3)
    statusCode = 403; // permission
  else if (fb?.code === 100) statusCode = 400; // bad request / unknown field

  const err = createError(parts.join(" "), statusCode, "META_GRAPH_ERROR");
  // Attach raw FB fields so callers can branch on them.
  (err as AppError & { fbCode?: number; fbSubcode?: number }).fbCode = fb?.code;
  (err as AppError & { fbCode?: number; fbSubcode?: number }).fbSubcode =
    fb?.error_subcode;
  return err;
}

function isTransient(httpStatus: number, fb: FbError | undefined): boolean {
  if (httpStatus >= 500) return true;
  if (fb?.code !== undefined && TRANSIENT_FB_CODES.has(fb.code)) return true;
  return false;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Log rate-limit usage headers at debug level (no behavioral throttling yet). */
function logUsage(res: Response, path: string): void {
  const usage =
    res.headers.get("x-business-use-case-usage") ||
    res.headers.get("x-app-usage") ||
    res.headers.get("x-fb-ads-insights-throttle");
  if (usage) {
    logger.log("Meta Graph rate-limit usage", undefined, { path, usage });
  }
}

/**
 * Fetch an absolute Graph URL with transient-retry + normalized errors.
 * Used both for freshly built request URLs and for following `paging.next` URLs.
 */
async function rawGraphFetch<T>(
  url: string,
  method: "GET" | "POST",
  maxRetries: number,
  pathForLog: string,
): Promise<T> {
  let attempt = 0;
  // up to maxRetries retries (so maxRetries + 1 attempts total)
  for (;;) {
    let res: Response;
    try {
      res = await fetch(url, { method });
    } catch (networkErr) {
      // Treat network failures like transient errors.
      if (attempt < maxRetries) {
        await sleep(250 * Math.pow(2, attempt));
        attempt += 1;
        continue;
      }
      throw createError(
        `Facebook Graph network error: ${
          networkErr instanceof Error ? networkErr.message : String(networkErr)
        }`,
        502,
        "META_GRAPH_NETWORK",
      );
    }

    logUsage(res, pathForLog);

    const text = await res.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { error: { message: text.slice(0, 200) || res.statusText } };
    }

    const fb = (body as { error?: FbError })?.error;

    if (res.ok && !fb) {
      return body as T;
    }

    if (isTransient(res.status, fb) && attempt < maxRetries) {
      await sleep(250 * Math.pow(2, attempt));
      attempt += 1;
      continue;
    }

    throw toAppError(res.status, fb);
  }
}

/** Make a single Graph request. Throws a normalized AppError on failure. */
export async function metaGraphRequest<T = unknown>(
  opts: GraphRequestOptions,
): Promise<T> {
  const url = buildUrl(opts);
  return rawGraphFetch<T>(
    url,
    opts.method || "GET",
    opts.maxRetries ?? 2,
    opts.path,
  );
}

interface GraphPage<TItem> {
  data?: TItem[];
  paging?: { next?: string; cursors?: { before?: string; after?: string } };
}

/**
 * Fetch an edge and auto-follow cursor/time pagination up to `maxPages`.
 * Returns the concatenated `data` array plus how many pages were read and
 * whether more remain (so callers can surface a truncation note).
 */
export async function metaGraphGetAll<TItem = unknown>(
  opts: GraphRequestOptions,
  maxPages = 10,
): Promise<{ data: TItem[]; pages: number; truncated: boolean }> {
  const first = await metaGraphRequest<GraphPage<TItem>>(opts);
  const items: TItem[] = [...(first.data ?? [])];
  let next = first.paging?.next;
  let pages = 1;

  while (next && pages < maxPages) {
    const page = await rawGraphFetch<GraphPage<TItem>>(
      next,
      "GET",
      opts.maxRetries ?? 2,
      opts.path,
    );
    items.push(...(page.data ?? []));
    next = page.paging?.next;
    pages += 1;
  }

  return { data: items, pages, truncated: Boolean(next) };
}

/**
 * Guard for page/post insights: reject since/until ranges wider than 90 days,
 * which Meta rejects server-side anyway. Accepts unix seconds or ISO strings.
 */
export function assertInsightsWindow(
  since?: string | number,
  until?: string | number,
): void {
  if (since === undefined || until === undefined) return;
  const toMs = (v: string | number): number => {
    if (typeof v === "number") return v < 1e12 ? v * 1000 : v; // unix seconds → ms
    const asNum = Number(v);
    if (!Number.isNaN(asNum)) return asNum < 1e12 ? asNum * 1000 : asNum;
    return new Date(v).getTime();
  };
  const ms = toMs(until) - toMs(since);
  if (ms > MAX_INSIGHTS_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    throw createError(
      `Insights date range exceeds the ${MAX_INSIGHTS_WINDOW_DAYS}-day maximum Meta allows per request. Narrow the since/until window.`,
      400,
      "META_INSIGHTS_WINDOW",
    );
  }
}
