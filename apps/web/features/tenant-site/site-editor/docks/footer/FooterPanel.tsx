"use client";

/**
 * Footer dock — wraps existing FooterPanel from components.
 * Reuse rather than duplicate the substantial existing component.
 */

import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { FooterPanel as FooterPanelImpl } from "../../../components/FooterPanel";

export function FooterPanel() {
  return (
    <div className="flex flex-col h-full gap-4 p-4 overflow-hidden">
      <Suspense
        fallback={
          <Card className="flex-1">
            <div className="p-4 text-sm text-gray-500">
              Loading footer settings...
            </div>
          </Card>
        }
      >
        <div className="flex-1 overflow-y-auto">
          <FooterPanelImpl />
        </div>
      </Suspense>
    </div>
  );
}
