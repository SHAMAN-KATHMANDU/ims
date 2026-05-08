"use client";

import React, { useMemo } from "react";
import type { SiteLayoutScope } from "@repo/shared";
import { listForScope } from "../../catalog/block-catalog";
import { BlockTile } from "./BlockTile";

interface RecentBlocksProps {
  scope?: SiteLayoutScope;
}

export function RecentBlocks({ scope }: RecentBlocksProps) {
  const scopedCatalog = useMemo(() => listForScope(scope), [scope]);

  const recentKinds = useMemo(() => {
    const stored = localStorage.getItem("siteEditor.recentBlocks");
    return (stored ? JSON.parse(stored) : []) as string[];
  }, []);

  if (recentKinds.length === 0) {
    return null;
  }

  const recentBlocks = recentKinds
    .map((kind) => scopedCatalog.find((b) => b.kind === kind))
    .filter((b): b is (typeof scopedCatalog)[number] => b !== undefined);

  if (recentBlocks.length === 0) {
    return null;
  }

  return (
    <div className="px-3 py-2 border-b border-gray-200 flex-shrink-0">
      <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
        Recent
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {recentBlocks.map((block) => (
          <BlockTile key={block.kind} catalog={block} />
        ))}
      </div>
    </div>
  );
}
