"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/useToast";
import { useTenant } from "@/features/tenants";
import {
  useTenantDomains,
  useDeleteTenantDomain,
  type TenantDomain,
} from "../hooks/use-tenant-domains";
import { AddDomainDialog } from "./AddDomainDialog";
import { VerifyDomainDialog } from "./VerifyDomainDialog";
import { TenantNavTabs } from "./TenantNavTabs";

export function TenantDomainsPage() {
  const params = useParams();
  const workspace = String(params.workspace ?? "");
  const tenantId = String(params.id ?? "");
  const { toast } = useToast();

  const { data: tenant } = useTenant(tenantId);
  const domainsQuery = useTenantDomains(tenantId);
  const deleteMutation = useDeleteTenantDomain();

  const [addOpen, setAddOpen] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState<TenantDomain | null>(
    null,
  );
  const [domainToDelete, setDomainToDelete] = useState<{
    id: string;
    hostname: string;
  } | null>(null);

  const handleDelete = (domain: TenantDomain) => {
    setDomainToDelete({ id: domain.id, hostname: domain.hostname });
  };

  const confirmDeleteDomain = async () => {
    if (!domainToDelete) return;
    try {
      await deleteMutation.mutateAsync(domainToDelete.id);
      toast({ title: "Domain deleted" });
    } catch (error) {
      toast({
        title: "Failed to delete",
        description: error instanceof Error ? error.message : "Please retry",
        variant: "destructive",
      });
    } finally {
      setDomainToDelete(null);
    }
  };

  const domains = domainsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${workspace}/platform/tenants`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tenants
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">
            {tenant?.name ?? "Loading…"}
          </h1>
          {tenant && (
            <p className="text-sm text-muted-foreground">/{tenant.slug}</p>
          )}
        </div>
      </div>

      <TenantNavTabs
        workspace={workspace}
        tenantId={tenantId}
        active="domains"
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Domains</CardTitle>
            <CardDescription>
              Hostnames that resolve to this tenant. Each domain must be
              DNS-verified before TLS can be issued.
            </CardDescription>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add domain
          </Button>
        </CardHeader>
        <CardContent>
          {domainsQuery.isLoading ? (
            <p
              className="py-6 text-center text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              Loading domains…
            </p>
          ) : domains.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No domains yet. Click “Add domain” to register the first one.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hostname</TableHead>
                    <TableHead>App</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-sm">
                        {d.hostname}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{d.appType}</Badge>
                      </TableCell>
                      <TableCell>
                        {d.isPrimary ? (
                          <Badge>Primary</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.verifiedAt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <ShieldCheck
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <ShieldAlert
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Pending
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!d.verifiedAt && (
                            <Button
                              size="sm"
                              variant="outline"
                              aria-label={`Verify ${d.hostname}`}
                              onClick={() => setVerifyingDomain(d)}
                            >
                              Verify
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(d)}
                            className="h-8 w-8"
                            aria-label={`Delete ${d.hostname}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddDomainDialog
        tenantId={tenantId}
        open={addOpen}
        onOpenChange={setAddOpen}
      />
      <VerifyDomainDialog
        domain={verifyingDomain}
        open={verifyingDomain !== null}
        onOpenChange={(v) => {
          if (!v) setVerifyingDomain(null);
        }}
      />

      <AlertDialog
        open={domainToDelete !== null}
        onOpenChange={(v) => {
          if (!v) setDomainToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete domain &quot;{domainToDelete?.hostname}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDomain}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
