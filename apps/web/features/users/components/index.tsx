"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Trash2, Plus, KeyRound, X, Search } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useBulkChangePassword,
  type User,
  type CreateUserData,
  type UpdateUserData,
} from "../hooks/use-users";
import { useAuthStore, selectUser } from "@/store/auth-store";
import {
  useUserSelectionStore,
  selectSelectedUserIds,
  selectClearUserSelection,
} from "@/store/user-selection-store";
import { RoleGuard } from "@/components/auth/role-guard";
import { useTenantUsage } from "@/features/dashboard";
import { useIsMobile } from "@/hooks/useMobile";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { UserForm } from "./components/UserForm";
import { UserTable } from "./components/UserTable";
import { BulkChangePasswordDialog } from "./components/BulkChangePasswordDialog";
import { BulkDeleteUsersDialog } from "./components/BulkDeleteUsersDialog";
import type { UserFormValues } from "../validation";
import { type UserRoleType } from "@repo/shared";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export function UsersPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "superadmin";
  const basePath = `/${workspace}`;
  const [userDialog, setUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [bulkChangePasswordOpen, setBulkChangePasswordOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("username");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 300);

  const selectedUserIds = useUserSelectionStore(selectSelectedUserIds);
  const clearSelection = useUserSelectionStore(selectClearUserSelection);
  const setUsers = useUserSelectionStore((s) => s.setUsers);

  const handleColumnSort = useCallback(
    (by: string, order: "asc" | "desc" | "none") => {
      if (order === "none") {
        setSortBy("username");
        setSortOrder("asc");
        return;
      }
      setSortBy(by);
      setSortOrder(order);
    },
    [],
  );

  const { data: usersResult, isLoading } = useUsers({
    page,
    limit: pageSize,
    sortBy,
    sortOrder,
    search: debouncedSearch || undefined,
    role: roleFilter === "all" ? undefined : roleFilter,
  });
  const { data: usage } = useTenantUsage();
  const users = usersResult?.users ?? [];
  const totalItems = usersResult?.pagination?.totalItems ?? 0;
  const usersUsage = usage?.users;
  const atUserLimit =
    usersUsage &&
    usersUsage.limit !== -1 &&
    usersUsage.used >= usersUsage.limit;
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const bulkChangePasswordMutation = useBulkChangePassword();
  const { toast } = useToast();
  const currentUser = useAuthStore(selectUser);
  const isMobile = useIsMobile();

  const onSubmit = async (data: UserFormValues) => {
    try {
      if (editingUser) {
        const updateData: UpdateUserData = {
          username: data.username,
          role: data.role as UserRoleType,
        };
        if (data.password) {
          updateData.password = data.password;
        }
        await updateUserMutation.mutateAsync({
          id: editingUser.id,
          data: updateData,
        });
        toast({ title: "User updated successfully" });
      } else {
        const createData: CreateUserData = {
          username: data.username,
          password: data.password!,
          role: data.role as UserRoleType,
        };
        await createUserMutation.mutateAsync(createData);
        toast({ title: "User created successfully" });
      }
      setUserDialog(false);
      setEditingUser(null);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save user",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: User) => {
    if (isMobile) {
      router.push(`${basePath}/users/${user.id}/edit`);
      return;
    }
    setEditingUser(user);
    setUserDialog(true);
  };

  const handleDeleteClick = (user: User) => {
    if (currentUser && user.id === currentUser.id) {
      toast({
        title: "Cannot delete yourself",
        description:
          "You cannot delete your own account. Please ask another superAdmin to do it.",
        variant: "destructive",
      });
      return;
    }
    setUserToDelete(user);
  };

  const handleDialogClose = (open: boolean) => {
    setUserDialog(open);
    if (!open) {
      setEditingUser(null);
    }
  };

  const handleBulkChangePassword = async (newPassword: string) => {
    const ids = Array.from(selectedUserIds);
    try {
      await bulkChangePasswordMutation.mutateAsync({
        userIds: ids,
        newPassword,
      });
      toast({ title: `Password changed for ${ids.length} user(s)` });
      clearSelection();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to change passwords",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleBulkDelete = async (idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;
    try {
      for (const id of idsToDelete) {
        await deleteUserMutation.mutateAsync(id);
      }
      toast({ title: `${idsToDelete.length} user(s) deleted` });
      clearSelection();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete users",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleBulkDeleteClick = () => {
    if (currentUser && selectedUserIds.has(currentUser.id)) {
      toast({
        title: "Cannot delete yourself",
        description: "Deselect yourself before bulk delete.",
        variant: "destructive",
      });
      return;
    }
    setBulkDeleteOpen(true);
  };

  return (
    <RoleGuard
      allowedRoles={["superAdmin"]}
      message="Only super administrators can access user management."
    >
      <div className="space-y-6 pb-24">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage users and their roles
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">All Users</h2>
          </div>
          {isMobile ? (
            atUserLimit ? (
              <Button disabled className="gap-2">
                <Plus className="h-4 w-4" aria-hidden="true" /> Add User
              </Button>
            ) : (
              <Button asChild>
                <Link href={`${basePath}/users/new`} className="gap-2">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add User
                </Link>
              </Button>
            )
          ) : (
            <>
              <Button
                onClick={() => {
                  setEditingUser(null);
                  setUserDialog(true);
                }}
                className="gap-2"
                disabled={atUserLimit}
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> Add User
              </Button>
              <UserForm
                open={userDialog}
                onOpenChange={handleDialogClose}
                editingUser={editingUser}
                onSubmit={onSubmit}
                onReset={() => setEditingUser(null)}
                renderTrigger={false}
              />
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Total: {totalItems}</CardDescription>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  placeholder="Search by username..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(DEFAULT_PAGE);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value);
                  setPage(DEFAULT_PAGE);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="platformAdmin">Platform Admin</SelectItem>
                  <SelectItem value="superAdmin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <UserTable
              users={users}
              isLoading={isLoading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleColumnSort}
              onEdit={handleEditUser}
              onDelete={handleDeleteClick}
              selectedUsers={selectedUserIds}
              onSelectionChange={setUsers}
              hasActiveFilters={search !== "" || roleFilter !== "all"}
              onClearFilters={() => {
                setSearch("");
                setRoleFilter("all");
                setPage(DEFAULT_PAGE);
              }}
            />
            {usersResult?.pagination && (
              <DataTablePagination
                pagination={{
                  currentPage: usersResult.pagination.currentPage,
                  totalPages: usersResult.pagination.totalPages,
                  totalItems: usersResult.pagination.totalItems,
                  itemsPerPage: usersResult.pagination.itemsPerPage,
                  hasNextPage: usersResult.pagination.hasNextPage,
                  hasPrevPage: usersResult.pagination.hasPrevPage,
                }}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(DEFAULT_PAGE);
                }}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>

        <BulkChangePasswordDialog
          open={bulkChangePasswordOpen}
          onOpenChange={setBulkChangePasswordOpen}
          userIds={Array.from(selectedUserIds)}
          onSubmit={handleBulkChangePassword}
          isSubmitting={bulkChangePasswordMutation.isPending}
        />

        <BulkDeleteUsersDialog
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          userIds={Array.from(selectedUserIds)}
          currentUserId={currentUser?.id}
          onConfirm={handleBulkDelete}
          isDeleting={deleteUserMutation.isPending}
        />

        {/* Sticky bulk action bar when items selected */}
        {selectedUserIds.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 py-3 px-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <span className="text-sm font-medium">
                {selectedUserIds.size} item
                {selectedUserIds.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBulkChangePasswordOpen(true)}
                  disabled={bulkChangePasswordMutation.isPending}
                >
                  <KeyRound className="h-4 w-4 mr-2" aria-hidden="true" />
                  Change password
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDeleteClick}
                >
                  <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => clearSelection()}
                  className="shrink-0"
                  aria-label="Clear selection"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* User Delete Confirmation Dialog */}
        <AlertDialog
          open={!!userToDelete}
          onOpenChange={(open) => !open && setUserToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete user &quot;{userToDelete?.username}
                &quot;. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!userToDelete) return;
                  try {
                    await deleteUserMutation.mutateAsync(userToDelete.id);
                    toast({ title: "User deleted successfully" });
                    setUserToDelete(null);
                  } catch (error: unknown) {
                    toast({
                      title: "Error",
                      description:
                        error instanceof Error
                          ? error.message
                          : "Failed to delete user",
                      variant: "destructive",
                    });
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  );
}
