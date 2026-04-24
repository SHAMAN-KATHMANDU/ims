"use client";

import { type ReactNode } from "react";
import { Lock, Shield } from "lucide-react";
import { PERMISSION_BY_KEY, type PermissionDef } from "@repo/shared";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface PermissionToggleRowProps {
  def: PermissionDef;
  /**
   * Whether this permission is currently granted. Consumed by the default
   * Switch control; callers that provide their own `control` ReactNode
   * ignore this (e.g. the segmented Allow/Inherit/Deny control in the
   * overwrites panel).
   */
  checked?: boolean;
  /** Fired when the Switch toggles. Ignored when `control` is provided. */
  onCheckedChange?: (next: boolean) => void;
  /** Disables interaction (system roles, insufficient perms, etc.). */
  disabled?: boolean;
  /**
   * Reason shown in a tooltip when disabled. Renders a small lock overlay.
   */
  disabledReason?: string;
  /**
   * Custom right-hand control (replaces the Switch). Used by the overwrites
   * panel to swap in a 3-state segmented control.
   */
  control?: ReactNode;
}

/**
 * Single-row primitive shared by RoleEditor (Switch) and
 * ResourceOverwritesPanel (SegmentedControl). Renders label, description,
 * `Dangerous` badge, and `Implies: …` hints.
 */
export function PermissionToggleRow({
  def,
  checked = false,
  onCheckedChange,
  disabled = false,
  disabledReason,
  control,
}: PermissionToggleRowProps) {
  const implies = (def.implies ?? [])
    .map((key) => PERMISSION_BY_KEY.get(key)?.label)
    .filter((l): l is string => Boolean(l));

  const rightControl = control ?? (
    <div className="flex items-center">
      {disabled && disabledReason ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="relative inline-flex"
                aria-label={disabledReason}
              >
                <Switch
                  checked={checked}
                  onCheckedChange={onCheckedChange}
                  disabled
                  aria-label={def.label}
                />
                <span className="pointer-events-none absolute -right-1 -top-1 rounded-full bg-background p-[1px] shadow">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent>{disabledReason}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Switch
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-label={def.label}
        />
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-4 py-3",
        disabled && "opacity-80",
      )}
      data-perm-key={def.key}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium leading-none">{def.label}</span>
          {def.dangerous && (
            <Badge
              variant="destructive"
              className="gap-1 px-1.5 py-0 text-[10px] uppercase tracking-wide"
            >
              <Shield className="h-3 w-3" aria-hidden />
              Dangerous
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{def.description}</p>
        {implies.length > 0 && (
          <Badge
            variant="secondary"
            className="font-normal text-[11px] text-muted-foreground"
          >
            Implies: {implies.join(", ")}
          </Badge>
        )}
      </div>
      <div className="pt-1">{rightControl}</div>
    </div>
  );
}
