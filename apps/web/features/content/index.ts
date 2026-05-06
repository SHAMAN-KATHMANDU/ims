/**
 * `features/content` — Content (CMS) mode public API.
 *
 * Following the feature-based architecture rule: only re-export what other
 * features / app routes are intended to import. Internal components are
 * not surfaced here; consumers import from this barrel only.
 */

export { ContentHub } from "./components/ContentHub";
export { ContentBlockEditor } from "./components/ContentBlockEditor";
export { ContentBlockPalette } from "./components/ContentBlockPalette";
export { VersionHistorySheet } from "./components/VersionHistorySheet";
export type { VersionListItem } from "./components/VersionHistorySheet";
export { ReviewStatusControls } from "./components/ReviewStatusControls";
export { PageHeaderCustomization } from "./components/PageHeaderCustomization";
export {
  CONTENT_BODY_KINDS,
  listContentBodyCatalog,
  isContentBodyKind,
} from "./lib/content-block-kinds";
export type { ContentTypeCard } from "./types";
