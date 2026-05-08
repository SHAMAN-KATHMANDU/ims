"use client";

import type { JSX } from "react";
import { useRouter } from "next/navigation";

export function NavigationRoute(): JSX.Element {
  const router = useRouter();

  // Redirect to site editor with header scope
  // Navigation editing is now handled via the site editor's header scope
  router.replace("./editor?scope=header");

  return null;
}
