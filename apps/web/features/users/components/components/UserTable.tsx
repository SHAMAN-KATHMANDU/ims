"use client";

import { useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  SortableTableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { type User } from "../../hooks/use-users";
import { Edit2, Trash2 } from "lucide-react";

interface UserTableProps {
  users: User[];
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc" | "none";
  onSort?: (sortBy: string, sortOrder: "asc" | "desc" | "none") => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  selectedUsers?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export function UserTable({
  users,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  selectedUsers = new Set(),
  onSelectionChange,
}: UserTableProps) {
  const canSort = Boolean(onSort);

  const handleSelectUser = useCallback(
    (userId: string, checked: boolean) => {
      if (!onSelectionChange) return;
      const newSelection = new Set(selectedUsers);
      if (checked) {
        newSelection.add(userId);
      } else {
        newSelection.delete(userId);
      }
      onSelectionChange(newSelection);
    },
    [selectedUsers, onSelectionChange],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!onSelectionChange) return;
      if (checked) {
        onSelectionChange(new Set(users.map((u) => u.id)));
      } else {
        onSelectionChange(new Set());
      }
    },
    [users, onSelectionChange],
  );

  const allSelected =
    users.length > 0 && users.every((u) => selectedUsers.has(u.id));

  const baseColumnCount = 4;
  const columnCount = onSelectionChange ? baseColumnCount + 1 : baseColumnCount;

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectionChange && (
                <TableHead className="w-12">
                  <Checkbox disabled aria-label="Select all users" />
                </TableHead>
              )}
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {onSelectionChange && <TableCell className="w-12" />}
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-16 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectionChange && (
                <TableHead className="w-12">
                  <Checkbox disabled aria-label="Select all users" />
                </TableHead>
              )}
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell
                colSpan={columnCount}
                className="text-center text-muted-foreground py-8"
              >
                No users found.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectionChange && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all users"
                />
              </TableHead>
            )}
            {canSort ? (
              <SortableTableHead
                sortKey="username"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort!}
              >
                Username
              </SortableTableHead>
            ) : (
              <TableHead>Username</TableHead>
            )}
            {canSort ? (
              <SortableTableHead
                sortKey="role"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort!}
              >
                Role
              </SortableTableHead>
            ) : (
              <TableHead>Role</TableHead>
            )}
            {canSort ? (
              <SortableTableHead
                sortKey="createdAt"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort!}
              >
                Created At
              </SortableTableHead>
            ) : (
              <TableHead>Created At</TableHead>
            )}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              {onSelectionChange && (
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className="w-12"
                >
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={(checked) =>
                      handleSelectUser(user.id, checked === true)
                    }
                    aria-label={`Select ${user.username}`}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">{user.username}</TableCell>
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
                  onClick={() => onEdit(user)}
                  aria-label="Edit user"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(user)}
                  aria-label="Delete user"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
