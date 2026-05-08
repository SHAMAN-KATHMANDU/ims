"use client";

import { useParams } from "next/navigation";
import { BuilderShell } from "@/features/site-cms/routes/BuilderShell";

export default function Page() {
  const { workspace, pageId } = useParams<{
    workspace: string;
    pageId: string;
  }>();
  return <BuilderShell workspace={workspace} pageId={pageId} />;
}
