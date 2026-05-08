"use client";

import type { JSX } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { SettingsPage } from "@/features/settings";

export function SettingsRoute(): JSX.Element {
  useSetBreadcrumbs(["Site", "Settings"]);

  return (
    <div style={{ padding: 0 }}>
      <SettingsPage />
    </div>
  );
}
