"use client";

import type { JSX } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import { PromoPage } from "@/features/promos";
import { Btn } from "../components/ui";
import { Plus } from "lucide-react";

export function OffersRoute(): JSX.Element {
  useSetBreadcrumbs(["Site", "Offers"], {
    right: (
      <Btn variant="primary" icon={Plus}>
        New offer
      </Btn>
    ),
  });

  return (
    <div style={{ padding: "20px 24px 64px" }}>
      <PromoPage />
    </div>
  );
}
