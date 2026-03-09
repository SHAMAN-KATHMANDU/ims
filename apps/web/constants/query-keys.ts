/**
 * Shared query key namespaces for TanStack Query.
 * Feature-specific keys live in feature hooks.
 */

export const queryKeyNamespaces = {
  users: ["users"] as const,
  products: ["products"] as const,
  sales: ["sales"] as const,
  audit: ["audit-logs"] as const,
} as const;
