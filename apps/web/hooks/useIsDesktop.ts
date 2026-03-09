"use client";

import { useIsMobile } from "./useMobile";

export function useIsDesktop(): boolean {
  return !useIsMobile();
}
