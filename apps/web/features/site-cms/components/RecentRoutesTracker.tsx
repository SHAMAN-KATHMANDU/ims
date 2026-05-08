"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useRecentRoutes } from "../hooks/use-recent-routes";
import type { JSX } from "react";

export function RecentRoutesTracker(): JSX.Element {
  const pathname = usePathname();
  const { addRoute } = useRecentRoutes();

  useEffect(() => {
    // Extract route info from pathname
    const segments = pathname.split("/");
    const siteIndex = segments.indexOf("site");
    if (siteIndex >= 0 && siteIndex < segments.length - 1) {
      const routeId = segments[siteIndex + 1];
      if (routeId) {
        // Convert route id to label
        const label = routeId
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        addRoute(pathname, label);
      }
    }
  }, [pathname, addRoute]);

  return <></>;
}
