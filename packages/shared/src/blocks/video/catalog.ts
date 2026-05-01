import type { CatalogEntry } from "../types";

export const videoCatalog: CatalogEntry<"video"> = {
  kind: "video",
  label: "Video",
  description: "YouTube, Vimeo, or direct MP4.",
  category: "content",
  createDefaultProps: () => ({
    source: "youtube",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    aspectRatio: "16/9",
  }),
};
