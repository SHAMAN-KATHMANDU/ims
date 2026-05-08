"use client";

import { BuilderShell as BuilderShellComponent } from "../builder/BuilderShell";
import type { JSX } from "react";

interface BuilderShellProps {
  workspace: string;
  pageId: string;
}

export function BuilderShell({
  workspace,
  pageId,
}: BuilderShellProps): JSX.Element {
  return <BuilderShellComponent workspace={workspace} pageId={pageId} />;
}
