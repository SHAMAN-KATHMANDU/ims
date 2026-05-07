"use client";

/**
 * Nav menu dock — wraps existing NavMenuPanel from components.
 * Reuse rather than duplicate the substantial existing component.
 */

import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { NavMenuPanel as NavMenuPanelImpl } from "../../../components/NavMenuPanel";

export function NavMenuPanel() {
  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-hidden">
      <Suspense
        fallback={
          <Card className="flex-1">
            <div className="p-4 text-sm text-gray-500">Loading nav menu...</div>
          </Card>
        }
      >
        <div className="flex-1 overflow-y-auto">
          <NavMenuPanelImpl />
        </div>
      </Suspense>
    </div>
  );
}
