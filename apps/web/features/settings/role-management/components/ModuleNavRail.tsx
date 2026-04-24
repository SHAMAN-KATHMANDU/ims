"use client";

import { useMemo } from "react";
import { AlertTriangle, Shield } from "lucide-react";
import {
  PERMISSIONS_BY_MODULE,
  type ModuleId,
  type PermissionDef,
} from "@repo/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { MODULE_LABELS, MODULE_ORDER } from "../types";

export interface ModuleNavRailProps {
  /** Currently selected module (shown in the right pane). */
  selectedModule: ModuleId;
  onSelectModule: (module: ModuleId) => void;
  /** Granted-bit count per module. */
  grantedByModule: Record<ModuleId, number>;
  /** Current search text. */
  search: string;
  onSearchChange: (value: string) => void;
  /** Results surfaced when search is non-empty. */
  searchResults: PermissionDef[];
  /** Whether ADMINISTRATOR bit is set. */
  isAdministrator: boolean;
  onToggleAdministrator: (next: boolean) => void;
  /** Disables interaction (system roles). */
  disabled?: boolean;
}

/**
 * Left rail: search box, module list with `granted/total` badges, and the
 * sticky Administrator toggle. Administrator ON requires AlertDialog confirm.
 */
export function ModuleNavRail({
  selectedModule,
  onSelectModule,
  grantedByModule,
  search,
  onSearchChange,
  searchResults,
  isAdministrator,
  onToggleAdministrator,
  disabled = false,
}: ModuleNavRailProps) {
  const moduleTotals = useMemo(() => {
    const totals = {} as Record<ModuleId, number>;
    for (const m of MODULE_ORDER) {
      totals[m] =
        (PERMISSIONS_BY_MODULE[m]?.length ?? 0) - (m === "SETTINGS" ? 1 : 0);
      // Subtract the SETTINGS.ADMINISTRATOR meta bit (bit 511) from the
      // SETTINGS module count — it's surfaced separately in the footer.
    }
    return totals;
  }, []);

  const searching = search.trim().length > 0;

  return (
    <aside className="flex w-[280px] flex-col border-r bg-muted/30">
      <div className="space-y-3 border-b p-3">
        <Input
          type="search"
          placeholder="Search permissions…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search permissions"
        />
      </div>

      <ScrollArea className="flex-1">
        {searching ? (
          <SearchResultsList results={searchResults} />
        ) : (
          <nav className="p-2">
            {MODULE_ORDER.map((mod) => {
              const total = moduleTotals[mod];
              const granted = grantedByModule[mod] ?? 0;
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => onSelectModule(mod)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                    "hover:bg-muted",
                    selectedModule === mod &&
                      "bg-background font-medium shadow-sm",
                  )}
                >
                  <span>{MODULE_LABELS[mod]}</span>
                  <span className="text-xs text-muted-foreground">
                    {granted}/{total}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </ScrollArea>

      <div className="sticky bottom-0 border-t bg-muted/60 p-3">
        <AdministratorToggle
          checked={isAdministrator}
          onChange={onToggleAdministrator}
          disabled={disabled}
        />
      </div>
    </aside>
  );
}

function SearchResultsList({ results }: { results: PermissionDef[] }) {
  if (results.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No permissions match your search.
      </div>
    );
  }

  // Group by module so results stay scannable.
  const grouped: Record<string, PermissionDef[]> = {};
  for (const def of results) {
    const bucket = `${def.module}::${def.submodule}`;
    if (!grouped[bucket]) grouped[bucket] = [];
    grouped[bucket].push(def);
  }

  return (
    <div className="space-y-3 p-2">
      {Object.entries(grouped).map(([bucket, perms]) => {
        const [module, submodule] = bucket.split("::");
        return (
          <div key={bucket}>
            <div className="px-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              {MODULE_LABELS[module as ModuleId]} · {submodule}
            </div>
            <ul className="space-y-0.5">
              {perms.map((def) => (
                <li
                  key={def.key}
                  className="rounded px-2 py-1 text-xs hover:bg-muted"
                  title={def.description}
                >
                  <div className="font-medium leading-tight">{def.label}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {def.description}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function AdministratorToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled: boolean;
}) {
  // Turning OFF administrator is unambiguous; turning ON requires a confirm.
  const handleClick = (next: boolean) => {
    if (!next) onChange(false);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Shield className="mt-0.5 h-4 w-4 text-destructive" aria-hidden />
          <div>
            <div className="text-sm font-medium">Grant Administrator</div>
            <p className="text-xs text-muted-foreground">
              Bypass every permission check — use sparingly.
            </p>
          </div>
        </div>

        {checked ? (
          <Switch
            checked
            disabled={disabled}
            onCheckedChange={() => handleClick(false)}
            aria-label="Disable administrator"
          />
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <span>
                <Switch
                  checked={false}
                  disabled={disabled}
                  aria-label="Enable administrator"
                />
              </span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Grant Administrator?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This role will bypass every permission check, including
                  destructive ones. Only grant this to trusted operators.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onChange(true)}
                >
                  Grant Administrator
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
