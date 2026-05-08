"use client";

import type { JSX } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { MediaLibraryPage } from "@/features/media";
import { Btn } from "../components/ui";
import { Folder, Upload } from "lucide-react";

export function MediaRoute(): JSX.Element {
  useSetBreadcrumbs(["Site", "Media"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn icon={Folder}>New folder</Btn>
        <Btn variant="primary" icon={Upload}>
          Upload
        </Btn>
      </div>
    ),
  });

  return (
    <div style={{ padding: "20px 24px 64px" }}>
      <MediaLibraryPage />
    </div>
  );
}
