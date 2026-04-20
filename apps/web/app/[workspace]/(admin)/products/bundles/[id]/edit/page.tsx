"use client";

import { use } from "react";
import { EditBundlePage } from "@/features/bundles";

type Props = {
  params: Promise<{ workspace: string; id: string }>;
};

export default function EditBundleRoute({ params }: Props) {
  const { id } = use(params);
  return <EditBundlePage bundleId={id} />;
}
