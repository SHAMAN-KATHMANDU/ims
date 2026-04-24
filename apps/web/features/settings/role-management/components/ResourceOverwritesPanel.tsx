"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PERMISSIONS,
  PERMISSIONS_BY_MODULE,
  PERMISSIONS_BY_SUBMODULE,
  type ModuleId,
  type PermissionDef,
} from "@repo/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/segmented-control";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/useToast";
import {
  Can,
  PermissionGate,
  fromBase64,
  hasBit,
  toBase64,
  useEffectivePermissions,
  useOverwrites,
  useRoles,
  useUpsertOverwrite,
  writeBit,
  type OverwriteSubjectType,
} from "@/features/permissions";
import { useUsers } from "@/features/users";
import { MODULE_LABELS, MODULE_ORDER, type OverwriteState } from "../types";
import { PermissionToggleRow } from "./PermissionToggleRow";
import { SubmoduleCard } from "./SubmoduleCard";

export interface ResourceOverwritesPanelProps {
  resourceId: string;
  /**
   * Catalog key of the parent resource's `*.UPDATE` permission. We gate the
   * whole panel on BOTH `SETTINGS.OVERWRITES.MANAGE` and this key so only
   * people who can edit the resource can shape its overwrites.
   */
  resourceUpdatePermission: string;
}

const OPTIONS: readonly SegmentedOption<OverwriteState>[] = [
  { value: "allow", label: "Allow", tone: "success" },
  { value: "inherit", label: "Inherit" },
  { value: "deny", label: "Deny", tone: "danger" },
] as const;

/**
 * Tri-state overwrite editor (Allow / Inherit / Deny) embeddable on any
 * resource detail page. Double-gated via nested `<PermissionGate>`.
 */
export function ResourceOverwritesPanel({
  resourceId,
  resourceUpdatePermission,
}: ResourceOverwritesPanelProps) {
  return (
    <PermissionGate perm="SETTINGS.OVERWRITES.MANAGE">
      <PermissionGate
        perm={resourceUpdatePermission}
        resourceId={resourceId}
        fallback={
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            You need update access on this resource to edit its permission
            overwrites.
          </div>
        }
      >
        <ResourceOverwritesPanelInner resourceId={resourceId} />
      </PermissionGate>
    </PermissionGate>
  );
}

function ResourceOverwritesPanelInner({ resourceId }: { resourceId: string }) {
  const { toast } = useToast();
  const [subjectType, setSubjectType] = useState<OverwriteSubjectType>("ROLE");
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const { data: overwrites = [] } = useOverwrites(resourceId);
  const { data: effective } = useEffectivePermissions(resourceId);
  const effectiveBits = useMemo(
    () => fromBase64(effective?.permissions ?? ""),
    [effective?.permissions],
  );

  // Find the active overwrite (if any) for the selected subject.
  const activeOverwrite = useMemo(() => {
    if (!subjectId) return null;
    return (
      overwrites.find(
        (o) =>
          o.subjectType === subjectType &&
          (subjectType === "ROLE"
            ? o.roleId === subjectId
            : o.userId === subjectId),
      ) ?? null
    );
  }, [overwrites, subjectId, subjectType]);

  const [allowBits, setAllowBits] = useState<Uint8Array>(
    () => new Uint8Array(64),
  );
  const [denyBits, setDenyBits] = useState<Uint8Array>(
    () => new Uint8Array(64),
  );

  useEffect(() => {
    setAllowBits(fromBase64(activeOverwrite?.allow ?? ""));
    setDenyBits(fromBase64(activeOverwrite?.deny ?? ""));
  }, [activeOverwrite]);

  const [activeModule, setActiveModule] = useState<ModuleId>("INVENTORY");

  const upsertMutation = useUpsertOverwrite();

  const handleTri = (def: PermissionDef, next: OverwriteState) => {
    // `allow` and `deny` are mutually exclusive per bit; inherit means both 0.
    setAllowBits((prev) => writeBit(prev, def.bit, next === "allow"));
    setDenyBits((prev) => writeBit(prev, def.bit, next === "deny"));
  };

  const handleSave = async () => {
    if (!subjectId) return;
    try {
      await upsertMutation.mutateAsync({
        resourceId,
        body: {
          subjectType,
          roleId: subjectType === "ROLE" ? subjectId : undefined,
          userId: subjectType === "USER" ? subjectId : undefined,
          allow: toBase64(allowBits),
          deny: toBase64(denyBits),
        },
      });
      toast({ title: "Overwrites saved" });
    } catch (err) {
      toast({
        title: "Failed to save overwrites",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const hasSubject = Boolean(subjectId);

  return (
    <div className="flex flex-col">
      <div className="space-y-3 border-b p-4">
        <h2 className="text-sm font-semibold">Subject</h2>
        <Tabs
          value={subjectType}
          onValueChange={(v) => {
            setSubjectType(v as OverwriteSubjectType);
            setSubjectId(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="ROLE">Roles</TabsTrigger>
            <TabsTrigger value="USER">Users</TabsTrigger>
          </TabsList>
          <TabsContent value="ROLE">
            <RolePicker value={subjectId} onChange={setSubjectId} />
          </TabsContent>
          <TabsContent value="USER">
            <UserPicker value={subjectId} onChange={setSubjectId} />
          </TabsContent>
        </Tabs>
      </div>

      {!hasSubject ? (
        <div className="p-6 text-sm text-muted-foreground">
          Pick a role or user above to edit their overwrites on this resource.
        </div>
      ) : (
        <>
          <ModuleTabs
            active={activeModule}
            onChange={setActiveModule}
            allowBits={allowBits}
            denyBits={denyBits}
          />

          <div className="space-y-4 p-4">
            {groupByOrderedSubmodule(activeModule).map(([submodule, perms]) => (
              <SubmoduleCard
                key={submodule}
                submodule={submodule}
                granted={perms.filter((p) => hasBit(allowBits, p.bit)).length}
                total={perms.length}
              >
                {perms.map((def) => {
                  const state = triStateFromBits(def, allowBits, denyBits);
                  const inheritedOn = hasBit(effectiveBits, def.bit);
                  return (
                    <PermissionToggleRow
                      key={def.key}
                      def={def}
                      control={
                        <div className="flex flex-col items-end gap-1">
                          <SegmentedControl
                            size="sm"
                            aria-label={`${def.label} state`}
                            options={OPTIONS}
                            value={state}
                            onChange={(v) => handleTri(def, v)}
                          />
                          {state === "inherit" && (
                            <Badge
                              variant="outline"
                              className="font-normal text-[10px]"
                            >
                              Inherit (currently: {inheritedOn ? "ON" : "OFF"})
                            </Badge>
                          )}
                        </div>
                      }
                    />
                  );
                })}
              </SubmoduleCard>
            ))}
          </div>

          <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background px-4 py-3">
            <Can perm="SETTINGS.OVERWRITES.MANAGE">
              <Button
                onClick={handleSave}
                disabled={upsertMutation.isPending || !subjectId}
              >
                {upsertMutation.isPending ? "Saving…" : "Save overwrites"}
              </Button>
            </Can>
          </div>
        </>
      )}
    </div>
  );
}

function triStateFromBits(
  def: PermissionDef,
  allow: Uint8Array,
  deny: Uint8Array,
): OverwriteState {
  if (hasBit(deny, def.bit)) return "deny";
  if (hasBit(allow, def.bit)) return "allow";
  return "inherit";
}

function groupByOrderedSubmodule(
  module: ModuleId,
): [string, PermissionDef[]][] {
  const all = (PERMISSIONS_BY_MODULE[module] ?? []).filter(
    (p) => p.key !== "SETTINGS.ADMINISTRATOR",
  ) as PermissionDef[];
  const order: string[] = [];
  const seen = new Set<string>();
  for (const p of all) {
    if (!seen.has(p.submodule)) {
      seen.add(p.submodule);
      order.push(p.submodule);
    }
  }
  return order.map((sub) => [
    sub,
    (PERMISSIONS_BY_SUBMODULE[`${module}::${sub}` as never] ?? []).filter(
      (p) => p.key !== "SETTINGS.ADMINISTRATOR",
    ) as PermissionDef[],
  ]);
}

function ModuleTabs({
  active,
  onChange,
  allowBits,
  denyBits,
}: {
  active: ModuleId;
  onChange: (m: ModuleId) => void;
  allowBits: Uint8Array;
  denyBits: Uint8Array;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b px-4 py-2">
      {MODULE_ORDER.map((mod) => {
        const count = PERMISSIONS.filter(
          (p) =>
            p.module === mod &&
            p.key !== "SETTINGS.ADMINISTRATOR" &&
            (hasBit(allowBits, p.bit) || hasBit(denyBits, p.bit)),
        ).length;
        const activeTab = mod === active;
        return (
          <button
            key={mod}
            type="button"
            onClick={() => onChange(mod)}
            className={`rounded-md px-3 py-1.5 text-sm ${
              activeTab
                ? "bg-background font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {MODULE_LABELS[mod]}
            {count > 0 && (
              <span className="ml-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] text-primary">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function RolePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
}) {
  const { data } = useRoles({ page: 1, limit: 100 });
  const roles = data?.roles ?? [];
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {roles.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={`rounded-full border px-3 py-1 text-sm ${
            value === r.id
              ? "border-foreground bg-foreground/5 font-medium"
              : "hover:bg-muted"
          }`}
        >
          <span
            aria-hidden
            className="mr-2 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: r.color ?? "#94a3b8" }}
          />
          {r.name}
        </button>
      ))}
      {roles.length === 0 && (
        <p className="text-sm text-muted-foreground">No roles yet.</p>
      )}
    </div>
  );
}

function UserPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string) => void;
}) {
  const { data } = useUsers({ limit: 20 });
  const users = data?.users ?? [];
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {users.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => onChange(u.id)}
          className={`rounded-full border px-3 py-1 text-sm ${
            value === u.id
              ? "border-foreground bg-foreground/5 font-medium"
              : "hover:bg-muted"
          }`}
        >
          {u.username}
        </button>
      ))}
      {users.length === 0 && (
        <p className="text-sm text-muted-foreground">No users yet.</p>
      )}
    </div>
  );
}
