"use client";

import { MediaLibraryPanel } from "@/components/media/MediaLibraryPanel";

export function MediaLibraryPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media library</h1>
        <p className="text-sm text-muted-foreground">
          Upload files for your workspace. Images can be reused from the library
          when editing product variations.
        </p>
      </div>
      <MediaLibraryPanel />
    </div>
  );
}
