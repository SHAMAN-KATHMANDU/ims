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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table";
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
import { Trash2, Edit2, Plus } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  type User,
  type CreateUserData,
  type UpdateUserData,
} from "@/hooks/useUser";
import { useAuthStore, selectUser } from "@/stores/auth-store";
import { RoleGuard } from "@/components/auth/role-guard";
import { useIsMobile } from "@/hooks/useMobile";
import { UserForm, type UserFormValues } from "./components/UserForm";
import { type UserRoleType } from "@repo/shared";

export function UsersPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "superadmin";
  const basePath = `/${workspace}`;
  const [userDialog, setUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [sortBy, setSortBy] = useState<string>("username");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleColumnSort = useCallback((by: string, order: "asc" | "desc") => {
    setSortBy(by);
    setSortOrder(order);
  }, []);

  const { data: users = [], isLoading } = useUsers({
    sortBy,
    sortOrder,
  });
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
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
          password: data.password,
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

  return (
    <RoleGuard
      allowedRoles={["superAdmin"]}
      message="Only super administrators can access user management."
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage users and their roles
          </p>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">All Users</h2>
          {isMobile ? (
            <Button asChild>
              <Link href={`${basePath}/users/new`} className="gap-2">
                <Plus className="h-4 w-4" /> Add User
              </Link>
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  setEditingUser(null);
                  setUserDialog(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Add User
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
            <CardDescription>Total: {users.length}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading users...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      sortKey="username"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleColumnSort}
                    >
                      Username
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="role"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleColumnSort}
                    >
                      Role
                    </SortableTableHead>
                    <SortableTableHead
                      sortKey="createdAt"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleColumnSort}
                    >
                      Created At
                    </SortableTableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.username}
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {user.role}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                            aria-label="Edit user"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(user)}
                            aria-label="Delete user"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
