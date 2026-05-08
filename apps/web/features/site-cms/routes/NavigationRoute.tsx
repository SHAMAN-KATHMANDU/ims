"use client";

import type { JSX } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { NavMenuPanel } from "@/features/tenant-site";
import { Btn } from "../components/ui";
import { Check } from "lucide-react";

export function NavigationRoute(): JSX.Element {
  useSetBreadcrumbs(["Site", "Navigation"], {
    right: (
      <div style={{ display: "flex", gap: 8 }}>
        <Btn>Discard</Btn>
        <Btn variant="primary" icon={Check}>
          Save & publish
        </Btn>
      </div>
    ),
  });

  return (
    <div style={{ padding: "20px 24px 64px" }}>
      <NavMenuPanel />
    </div>
  );
}
