"use client";

import { useCallback } from "react";
import { format } from "date-fns";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { type Member } from "../../hooks/use-members";
import { Eye, Edit } from "lucide-react";

interface MemberTableProps {
  members: Member[];
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onView: (member: Member) => void;
  onEdit: (member: Member) => void;
  // Selection props
  selectedMembers?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export function MemberTable({
  members,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  selectedMembers = new Set(),
  onSelectionChange,
}: MemberTableProps) {
  const canSort = Boolean(onSort);
  // Selection handlers
  const handleSelectMember = useCallback(
    (memberId: string, checked: boolean) => {
      if (!onSelectionChange) return;

      const newSelection = new Set(selectedMembers);
      if (checked) {
        newSelection.add(memberId);
      } else {
        newSelection.delete(memberId);
      }
      onSelectionChange(newSelection);
    },
    [selectedMembers, onSelectionChange],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!onSelectionChange) return;

      if (checked) {
        const allIds = new Set(members.map((m) => m.id));
        onSelectionChange(allIds);
      } else {
        onSelectionChange(new Set());
      }
    },
    [members, onSelectionChange],
  );

  // Check if all members on current page are selected
  const allSelected =
    members.length > 0 && members.every((m) => selectedMembers.has(m.id));

  // Calculate column count for empty state
  const baseColumnCount = 7; // Phone, Name, Email, Total Sales, Status, Joined, Actions
  const columnCount = onSelectionChange ? baseColumnCount + 1 : baseColumnCount;
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectionChange && (
                <TableHead className="w-12">
                  <Checkbox disabled aria-label="Select all members" />
                </TableHead>
              )}
              <TableHead>Phone</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Total Sales</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
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

  if (members.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelectionChange && (
                <TableHead className="w-12">
                  <Checkbox disabled aria-label="Select all members" />
                </TableHead>
              )}
              <TableHead>Phone</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Total Sales</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columnCount} className="text-center py-8">
                <p className="text-muted-foreground">No members found</p>
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
                  aria-label="Select all members"
                />
              </TableHead>
            )}
            <TableHead>Phone</TableHead>
            {canSort ? (
              <SortableTableHead
                sortKey="name"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort!}
              >
                Name
              </SortableTableHead>
            ) : (
              <TableHead>Name</TableHead>
            )}
            <TableHead>Email</TableHead>
            <TableHead>Total Sales</TableHead>
            <TableHead>Status</TableHead>
            {canSort ? (
              <SortableTableHead
                sortKey="createdAt"
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                onSort={onSort!}
              >
                Joined
              </SortableTableHead>
            ) : (
              <TableHead>Joined</TableHead>
            )}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              {onSelectionChange && (
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className="w-12"
                >
                  <Checkbox
                    checked={selectedMembers.has(member.id)}
                    onCheckedChange={(checked) =>
                      handleSelectMember(member.id, checked === true)
                    }
                    aria-label={`Select ${member.phone}`}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">{member.phone}</TableCell>
              <TableCell>{member.name || "-"}</TableCell>
              <TableCell>{member.email || "-"}</TableCell>
              <TableCell>{member._count?.sales || 0}</TableCell>
              <TableCell>
                <Badge
                  variant={member.isActive ? "default" : "secondary"}
                  className={
                    member.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }
                >
                  {member.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                {format(new Date(member.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(member)}
                    aria-label="View member"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(member)}
                    aria-label="Edit member"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
