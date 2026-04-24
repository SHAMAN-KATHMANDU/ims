"use client";

import dynamic from "next/dynamic";
import { LoadingPage } from "@/components/layout/loading-page";
import { PermissionGate } from "@/features/permissions";

const NewSalePage = dynamic(
  () => import("@/features/sales").then((m) => ({ default: m.NewSalePage })),
  { loading: () => <LoadingPage />, ssr: false },
);

export default function NewSaleRoute() {
  return (
    <PermissionGate perm="SALES.SALES.CREATE">
      <NewSalePage />
    </PermissionGate>
  );
}
