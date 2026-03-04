"use client";

import { useState } from "react";
import { useToast } from "@/hooks/useToast";
import {
  useTrashItems,
  useRestoreTrashItem,
  usePermanentlyDeleteTrashItem,
} from "../hooks/use-trash";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "product", label: "Product" },
  { value: "category", label: "Category" },
  { value: "subcategory", label: "SubCategory" },
  { value: "vendor", label: "Vendor" },
  { value: "member", label: "Member" },
  { value: "location", label: "Location" },
  { value: "promocode", label: "Promo Code" },
  { value: "company", label: "Company" },
  { value: "contact", label: "Contact" },
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "task", label: "Task" },
  { value: "activity", label: "Activity" },
  { value: "pipeline", label: "Pipeline" },
];

export function TrashPage() {
  const { toast } = useToast();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [entityType, setEntityType] = useState<string>("all");
  const [permanentlyDeleteTarget, setPermanentlyDeleteTarget] = useState<{
    entityType: string;
    id: string;
    name: string;
  } | null>(null);

  const { data: trashResponse, isLoading } = useTrashItems({
    page,
    limit: pageSize,
    entityType: entityType === "all" ? undefined : entityType,
  });

  const items = trashResponse?.data ?? [];
  const pagination = trashResponse?.pagination;

  const restoreMutation = useRestoreTrashItem();
  const permanentlyDeleteMutation = usePermanentlyDeleteTrashItem();

  const handleRestore = async (item: {
    entityType: string;
    id: string;
    name: string;
  }) => {
    try {
      await restoreMutation.mutateAsync({
        entityType: item.entityType,
        id: item.id,
      });
      toast({
        title: "Restored",
        description: `"${item.name}" has been restored.`,
      });
    } catch {
      toast({
        title: "Restore failed",
        variant: "destructive",
      });
    }
  };

  const handlePermanentlyDelete = async () => {
    if (!permanentlyDeleteTarget) return;
    try {
      await permanentlyDeleteMutation.mutateAsync({
        entityType: permanentlyDeleteTarget.entityType,
        id: permanentlyDeleteTarget.id,
      });
      toast({
        title: "Permanently deleted",
        description: "The item has been permanently removed.",
      });
      setPermanentlyDeleteTarget(null);
    } catch {
      toast({
        title: "Delete failed",
        variant: "destructive",
      });
    }
  };

  const trashPagination = {
    currentPage: page,
    totalPages: pagination?.totalPages ?? 1,
    totalItems: pagination?.totalItems ?? 0,
    itemsPerPage: pageSize,
    hasNextPage: pagination?.hasNextPage ?? false,
    hasPrevPage: pagination?.hasPrevPage ?? false,
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Trash</CardTitle>
          <CardDescription>
            Deleted items are kept for 30 days, then automatically permanently
            deleted. You can restore or permanently delete items from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <Select
              value={entityType}
              onValueChange={(v) => {
                setEntityType(v);
                setPage(DEFAULT_PAGE);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Trash2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>No items in trash</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Deleted</TableHead>
                    <TableHead className="w-[140px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={`${item.entityType}-${item.id}`}>
                      <TableCell>
                        <span className="font-medium">{item.entityType}</span>
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.deletedAt
                          ? format(
                              new Date(item.deletedAt),
                              "MMM d, yyyy HH:mm",
                            )
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(item)}
                            disabled={restoreMutation.isPending}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Restore
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              setPermanentlyDeleteTarget({
                                entityType: item.entityType,
                                id: item.id,
                                name: item.name,
                              })
                            }
                            disabled={permanentlyDeleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.totalPages > 1 && (
                <DataTablePagination
                  pagination={trashPagination}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(DEFAULT_PAGE);
                  }}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!permanentlyDeleteTarget}
        onOpenChange={(open) => !open && setPermanentlyDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;
              {permanentlyDeleteTarget?.name}&quot;. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setPermanentlyDeleteTarget(null)}
            >
              Cancel
            </Button>
            <AlertDialogAction
              onClick={handlePermanentlyDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Permanently delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
