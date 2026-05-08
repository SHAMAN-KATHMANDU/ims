"use client";

import type { JSX } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { CollectionsPage } from "@/features/tenant-site";
import { Btn } from "../components/ui";
import { Upload, Plus } from "lucide-react";

export function CollectionsRoute(): JSX.Element {
  useSetBreadcrumbs(["Site", "Collections"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn icon={Upload}>Import CSV</Btn>
        <Btn variant="primary" icon={Plus}>
          New collection
        </Btn>
      </div>
    ),
  });

  return (
    <div style={{ padding: "20px 24px 64px" }}>
      <CollectionsPage />
    </div>
  );
}
