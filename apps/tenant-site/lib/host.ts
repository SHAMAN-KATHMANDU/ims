/**
 * Host header parsing — extract the hostname from an incoming Host header,
 * stripping the port and handling bracketed IPv6 addresses.
 */

/**
 * Parse the Host header and extract the hostname without port.
 *
 * Handles:
 *   - "example.com" → "example.com"
 *   - "example.com:3000" → "example.com"
 *   - "[::1]" → "[::1]"
 *   - "[::1]:3000" → "[::1]"
 *   - Lowercase the result
 *   - Return empty string if input is empty or malformed
 */
export function parseHostHeader(hostHeader: string): string {
  if (!hostHeader) return "";

  // Strip the port without mangling bracketed IPv6 hosts: "[::1]:3000" must
  // yield "[::1]" (a bare split(":") would return "["), while "host:3000"
  // still yields "host".
  const host = (
    hostHeader.startsWith("[")
      ? (hostHeader.match(/^(\[[^\]]*\])/)?.[1] ?? "")
      : (hostHeader.split(":")[0] ?? "")
  ).toLowerCase();

  return host;
}
