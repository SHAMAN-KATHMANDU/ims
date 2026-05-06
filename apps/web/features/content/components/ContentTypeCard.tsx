"use client";

/**
 * ContentTypeCard — one tile in the Content Hub grid.
 *
 * Tries to be unobtrusive: icon, label, short description, optional count
 * line. The whole card is the link; disabled cards render a non-link with
 * the "Soon" pill instead.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentTypeCard as ContentTypeCardModel } from "../types";

export function ContentTypeCard({
  card,
  workspace,
}: {
  card: ContentTypeCardModel;
  workspace: string;
}) {
  const href = `/${workspace}/${card.path}`;
  const Icon = card.icon;

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/30 text-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        {card.disabled ? (
          <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Soon
          </span>
        ) : (
          <ArrowRight
            className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-4 space-y-1">
        <h3 className="text-base font-semibold leading-tight text-foreground">
          {card.label}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {card.description}
        </p>
      </div>
      {card.count !== undefined && (
        <p className="mt-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          {card.count}
        </p>
      )}
    </>
  );

  const baseClass =
    "group flex flex-col rounded-lg border border-border bg-card p-5 transition-colors";
  const interactiveClass = "hover:border-primary/40 hover:bg-muted/30";
  const disabledClass = "opacity-60 cursor-not-allowed";

  if (card.disabled) {
    return (
      <div
        aria-disabled="true"
        className={cn(baseClass, disabledClass)}
        title="Coming soon"
      >
        {inner}
      </div>
    );
  }

  return (
    <Link href={href} className={cn(baseClass, interactiveClass)}>
      {inner}
    </Link>
  );
}
