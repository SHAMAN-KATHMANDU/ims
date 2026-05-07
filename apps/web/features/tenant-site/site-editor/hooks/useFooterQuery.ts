/**
 * Footer dock query hook.
 * Placeholder — footer data comes from site layout theme tokens.
 * No dedicated footer API endpoint yet.
 * TODO: when footer settings API is ready, create a real mutation.
 */

export const footerKeys = {
  all: ["footer"] as const,
  config: () => [...footerKeys.all, "config"] as const,
};
