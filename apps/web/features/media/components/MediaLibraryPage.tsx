"use client";

import { MediaLibraryPanel } from "./MediaLibraryPanel";

export function MediaLibraryPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
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
