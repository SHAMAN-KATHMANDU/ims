import type { ReactNode } from "react";
import { EnvFeaturePageGuard } from "@/features/flags";
import { EnvFeature } from "@repo/shared";

// TODO: add plan-based FeaturePageGuard when a transfers Feature flag lands
export default function TransfersLayout({ children }: { children: ReactNode }) {
  return (
    <EnvFeaturePageGuard envFeature={EnvFeature.TRANSFERS}>
      {children}
    </EnvFeaturePageGuard>
  );
}
