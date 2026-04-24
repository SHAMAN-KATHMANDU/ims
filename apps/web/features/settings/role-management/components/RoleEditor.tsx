"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Copy } from "lucide-react";
import {
  PERMISSIONS,
  PERMISSIONS_BY_MODULE,
  PERMISSIONS_BY_SUBMODULE,
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import {
  PermissionGate,
  hasBit,
  useCreateRole,
  useRole,
  useUpdateRole,
  type CreateRoleData,
  type Role,
  type UpdateRoleData,
} from "@/features/permissions";
import { MODULE_LABELS, ROLE_COLOR_SWATCHES } from "../types";
import { useRoleEditorState } from "../hooks/use-role-editor-state";
import { ModuleNavRail } from "./ModuleNavRail";
import { PermissionToggleRow } from "./PermissionToggleRow";
import { RoleMembersPanel } from "./RoleMembersPanel";
import { SubmoduleCard } from "./SubmoduleCard";

export interface RoleEditorProps {
  /** Omit to open the "create new" variant with an empty bitset. */
  roleId?: string;
}

const EMPTY_BITSET_WIRE = (() => {
  // A 64-byte zero buffer encodes to 88 base64 chars (`AAAA…`).
  if (typeof btoa === "function") {
    return btoa(String.fromCharCode(...new Uint8Array(64)));
  }
  return Buffer.from(new Uint8Array(64)).toString("base64");
})();

export function RoleEditor({ roleId }: RoleEditorProps) {
  return (
    <PermissionGate perm="SETTINGS.ROLES.MANAGE">
      <RoleEditorInner roleId={roleId} />
    </PermissionGate>
  );
}

function RoleEditorInner({ roleId }: RoleEditorProps) {
  const router = useRouter();
  const params = useParams();
  const workspace = String(params.workspace ?? "");
  const { toast } = useToast();

  const isEdit = Boolean(roleId);
  const { data: loadedRole, isLoading } = useRole(roleId);

  const initial = useMemo(
    () =>
      loadedRole
        ? {
            name: loadedRole.name,
            priority: loadedRole.priority,
            color: loadedRole.color,
            permissions: loadedRole.permissions,
          }
        : {
            name: "",
            priority: 100,
            color: ROLE_COLOR_SWATCHES[0] ?? null,
            permissions: EMPTY_BITSET_WIRE,
          },
    [loadedRole],
  );

  const editor = useRoleEditorState({ initial });
  const { form } = editor;

  const [activeModule, setActiveModule] = useState<ModuleId>("INVENTORY");
  const [search, setSearch] = useState("");

  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();

  const isSystem = loadedRole?.isSystem === true;
  const disabled = isSystem;

  // Warn on navigation while dirty.
  const isDirty =
    form.formState.isDirty || editor.isBitsetDirty || editor.dirtyCount > 0;
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (isEdit && roleId) {
        const body: UpdateRoleData = {
          name: values.name,
          priority: values.priority,
          color: values.color,
          permissions: values.permissions,
        };
        await updateMutation.mutateAsync({ roleId, body });
        toast({ title: "Role updated" });
      } else {
        const body: CreateRoleData = {
          name: values.name,
          priority: values.priority,
          color: values.color,
          permissions: values.permissions,
        };
        const created = await createMutation.mutateAsync(body);
        toast({ title: "Role created" });
        router.push(`/${workspace}/settings/roles/${created.id}`);
      }
    } catch (err) {
      toast({
        title: "Failed to save role",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  });

  const filteredSearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [] as PermissionDef[];
    return PERMISSIONS.filter(
      (p) =>
        p.key.toLowerCase().includes(q) ||
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    ).slice(0, 50) as unknown as PermissionDef[];
  }, [search]);

  if (isLoading && isEdit) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
        Loading role…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b p-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${workspace}/settings/roles`)}
            aria-label="Back to roles"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">
              {isEdit ? (loadedRole?.name ?? "Edit role") : "New role"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSystem
                ? "System role — read-only. Duplicate to customize."
                : "Configure permissions for this role."}
            </p>
          </div>
        </div>

        {isSystem && (
          <Button
            variant="outline"
            onClick={() => {
              toast({
                title: "Duplicate — coming soon",
                description:
                  "Clone this role into a custom one you can edit. (Ships with Phase 4.)",
              });
            }}
          >
            <Copy className="mr-2 h-4 w-4" /> Duplicate as custom role
          </Button>
        )}
      </div>

      {/* Role meta */}
      <Card className="m-4 mb-0">
        <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              placeholder="e.g. Warehouse Manager"
              disabled={disabled}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-priority">
              Priority ({form.watch("priority")})
            </Label>
            <Slider
              id="role-priority"
              min={0}
              max={10000}
              step={10}
              value={[form.watch("priority") ?? 0]}
              onValueChange={(v) =>
                form.setValue("priority", v[0] ?? 0, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Higher priority wins when a user has multiple roles.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_COLOR_SWATCHES.map((hex) => {
                const active = form.watch("color") === hex;
                return (
                  <button
                    type="button"
                    key={hex}
                    disabled={disabled}
                    onClick={() =>
                      form.setValue("color", hex, { shouldDirty: true })
                    }
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      active
                        ? "scale-110 border-foreground"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: hex }}
                    aria-label={`Select color ${hex}`}
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Permissions / Members */}
      <Tabs defaultValue="permissions" className="mt-4 flex flex-1 flex-col">
        <div className="px-4">
          <TabsList>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="members" disabled={!isEdit}>
              Members
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="permissions"
          className="flex flex-1 overflow-hidden border-t"
        >
          {/* Left rail */}
          <ModuleNavRail
            selectedModule={activeModule}
            onSelectModule={setActiveModule}
            grantedByModule={editor.grantedByModule}
            search={search}
            onSearchChange={setSearch}
            searchResults={filteredSearch}
            isAdministrator={editor.isAdministrator}
            onToggleAdministrator={editor.setAdministrator}
            disabled={disabled}
          />

          {/* Right pane */}
          <ScrollArea className="flex-1">
            <ModulePane
              module={activeModule}
              bits={editor.bits}
              disabled={disabled}
              onRequestToggle={editor.requestToggle}
              onGrantAllModule={() => editor.grantAllInModule(activeModule)}
              onRevokeAllModule={() => editor.revokeAllInModule(activeModule)}
              onGrantAllSub={(sub) =>
                editor.grantAllInSubmodule(activeModule, sub)
              }
              onRevokeAllSub={(sub) =>
                editor.revokeAllInSubmodule(activeModule, sub)
              }
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="members" className="flex-1 border-t p-4">
          {roleId && loadedRole && (
            <RoleMembersPanel roleId={roleId} role={loadedRole} />
          )}
        </TabsContent>
      </Tabs>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t bg-background px-4 py-3 shadow-sm">
        <span className="mr-auto text-sm text-muted-foreground">
          {editor.dirtyCount > 0
            ? `${editor.dirtyCount} permission change${
                editor.dirtyCount === 1 ? "" : "s"
              } pending`
            : "No changes"}
        </span>
        <Button
          variant="outline"
          onClick={() => router.push(`/${workspace}/settings/roles`)}
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={
            !isDirty ||
            disabled ||
            createMutation.isPending ||
            updateMutation.isPending
          }
        >
          {createMutation.isPending || updateMutation.isPending
            ? "Saving…"
            : `Save changes${
                editor.dirtyCount > 0 ? ` (${editor.dirtyCount})` : ""
              }`}
        </Button>
      </div>

      {/* Cascade / dangerous dialogs */}
      <CascadeDialogHost
        cascade={editor.cascade}
        onCancel={editor.closeCascade}
      />
    </div>
  );
}

function CascadeDialogHost({
  cascade,
  onCancel,
}: {
  cascade: ReturnType<typeof useRoleEditorState>["cascade"];
  onCancel: () => void;
}) {
  if (cascade.kind === "none") return null;

  if (cascade.kind === "dangerous") {
    return (
      <AlertDialog open onOpenChange={(o) => !o && onCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Grant &ldquo;{cascade.def.label}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cascade.def.description} This action is marked dangerous —
              confirm you want this role to have it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={cascade.onConfirm}
            >
              Grant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // disabling-implied
  return (
    <AlertDialog open onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Disable &ldquo;{cascade.def.label}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Disabling &ldquo;{cascade.def.label}&rdquo; will also disable:{" "}
            <strong>{cascade.dependents.map((d) => d.label).join(", ")}</strong>
            . These depend on it. Continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={cascade.onConfirm}>
            Disable all
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ModulePaneProps {
  module: ModuleId;
  bits: Uint8Array;
  disabled: boolean;
  onRequestToggle: (def: PermissionDef, next: boolean) => void;
  onGrantAllModule: () => void;
  onRevokeAllModule: () => void;
  onGrantAllSub: (submodule: string) => void;
  onRevokeAllSub: (submodule: string) => void;
}

function ModulePane({
  module,
  bits,
  disabled,
  onRequestToggle,
  onGrantAllModule,
  onRevokeAllModule,
  onGrantAllSub,
  onRevokeAllSub,
}: ModulePaneProps) {
  const allInModule = (PERMISSIONS_BY_MODULE[module] ?? []) as PermissionDef[];
  const granted = allInModule.filter(
    (p) => p.key !== "SETTINGS.ADMINISTRATOR" && hasBit(bits, p.bit),
  ).length;
  const total = allInModule.filter(
    (p) => p.key !== "SETTINGS.ADMINISTRATOR",
  ).length;

  // Group by submodule (ordered by first appearance to match catalog order).
  const order: string[] = [];
  const seen = new Set<string>();
  for (const p of allInModule) {
    if (p.key === "SETTINGS.ADMINISTRATOR") continue;
    if (!seen.has(p.submodule)) {
      seen.add(p.submodule);
      order.push(p.submodule);
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{MODULE_LABELS[module]}</h2>
          <p className="text-sm text-muted-foreground">
            {granted} of {total} permissions granted
          </p>
        </div>
        {!disabled && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onGrantAllModule}>
              Grant all in module
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRevokeAllModule}
              className="text-destructive"
            >
              Revoke all in module
            </Button>
          </div>
        )}
      </div>

      {order.map((sub) => {
        const perms = (PERMISSIONS_BY_SUBMODULE[`${module}::${sub}` as never] ??
          []) as PermissionDef[];
        const permsNoAdmin = perms.filter(
          (p) => p.key !== "SETTINGS.ADMINISTRATOR",
        );
        const subGranted = permsNoAdmin.filter((p) =>
          hasBit(bits, p.bit),
        ).length;

        return (
          <SubmoduleCard
            key={sub}
            submodule={sub}
            granted={subGranted}
            total={permsNoAdmin.length}
            disabled={disabled}
            onGrantAll={() => onGrantAllSub(sub)}
            onRevokeAll={() => onRevokeAllSub(sub)}
          >
            {permsNoAdmin.map((def) => (
              <PermissionToggleRow
                key={def.key}
                def={def}
                checked={hasBit(bits, def.bit)}
                onCheckedChange={(next) => onRequestToggle(def, next)}
                disabled={disabled}
                disabledReason={
                  disabled ? "System role — clone to customize" : undefined
                }
              />
            ))}
          </SubmoduleCard>
        );
      })}
    </div>
  );
}

export type { Role };
