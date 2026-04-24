"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface SubmoduleCardProps {
  submodule: string;
  granted: number;
  total: number;
  /** Disables the kebab bulk actions (e.g. system role viewing). */
  disabled?: boolean;
  onGrantAll?: () => void;
  onRevokeAll?: () => void;
  children: ReactNode;
}

/**
 * Collapsible card for a submodule inside the RoleEditor right pane. Shows
 * `granted/total` count and exposes "Grant/Revoke all in submodule" via a
 * kebab menu, per the §5c spec.
 */
export function SubmoduleCard({
  submodule,
  granted,
  total,
  disabled = false,
  onGrantAll,
  onRevokeAll,
  children,
}: SubmoduleCardProps) {
  const [open, setOpen] = useState(true);

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left focus-visible:outline-none"
          aria-expanded={open}
          aria-label={`Toggle ${submodule}`}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open ? "rotate-0" : "-rotate-90",
            )}
          />
          <span className="text-sm font-medium">{submodule}</span>
          <span className="text-xs text-muted-foreground">
            {granted}/{total} granted
          </span>
        </button>

        {!disabled && (onGrantAll || onRevokeAll) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`${submodule} actions`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onGrantAll && (
                <DropdownMenuItem onClick={onGrantAll}>
                  Grant all in submodule
                </DropdownMenuItem>
              )}
              {onRevokeAll && (
                <DropdownMenuItem
                  onClick={onRevokeAll}
                  className="text-destructive focus:text-destructive"
                >
                  Revoke all in submodule
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {open && <div className="divide-y">{children}</div>}
    </Card>
  );
}
