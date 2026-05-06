/**
 * `features/global-search` — cross-entity search for the cmd-K palette.
 *
 * Public surface is intentionally small: a single hook the palette
 * consumes. Each entity hook called underneath is feature-internal and
 * goes through its own barrel.
 */

export {
  useGlobalSearch,
  type GlobalSearchKind,
  type GlobalSearchResult,
  type UseGlobalSearchOptions,
} from "./hooks/use-global-search";
