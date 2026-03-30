import { buildPublicUrl } from "./s3Key";

export function normalizePublicUrlPrefix(prefix: string): string {
  const t = prefix.trim();
  if (!t) return "";
  return t.endsWith("/") ? t : `${t}/`;
}

export function parsePublicUrlAliases(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => normalizePublicUrlPrefix(s.trim()))
    .filter(Boolean);
}

/**
 * If the client sends publicUrl for backward compatibility, it must match the
 * canonical primary URL or one of the configured alias prefixes (e.g. CloudFront).
 */
export function isClientPublicUrlCompatible(
  key: string,
  clientUrl: string | undefined,
  primaryPrefix: string,
  aliasPrefixes: string[],
): boolean {
  if (clientUrl == null || clientUrl === "") return true;
  const primary = normalizePublicUrlPrefix(primaryPrefix);
  const candidates = [
    buildPublicUrl(key, primary),
    ...aliasPrefixes.map((p) => buildPublicUrl(key, p)),
  ];
  return candidates.includes(clientUrl);
}
