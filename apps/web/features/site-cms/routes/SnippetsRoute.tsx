"use client";

import type { JSX } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { SnippetsListPage } from "@/features/snippets";
import { Btn } from "../components/ui";
import { Code, Plus } from "lucide-react";

export function SnippetsRoute(): JSX.Element {
  useSetBreadcrumbs(["Site", "Snippets"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn icon={Code}>New code snippet</Btn>
        <Btn variant="primary" icon={Plus}>
          New snippet
        </Btn>
      </div>
    ),
  });

  return (
    <div style={{ padding: "20px 24px 64px" }}>
      <SnippetsListPage />
    </div>
  );
}
