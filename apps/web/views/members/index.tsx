"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/useToast";
import {
  useMembersPaginated,
  useMember,
  useCreateMember,
  useUpdateMember,
  type Member,
  type CreateMemberData,
  type UpdateMemberData,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
} from "@/hooks/useMember";
import { MemberTable } from "./components/MemberTable";
import { MemberForm } from "./components/MemberForm";
import { MemberDetail } from "./components/MemberDetail";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";

export function MembersPage() {
  const { toast } = useToast();

  // Filter state
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Data fetching
  const { data: membersResponse, isLoading: membersLoading } =
    useMembersPaginated({
      page,
      limit: pageSize,
      search,
    });

  const members = membersResponse?.data ?? [];

  const membersPagination: PaginationState | null = membersResponse?.pagination
    ? {
        currentPage: membersResponse.pagination.currentPage,
        totalPages: membersResponse.pagination.totalPages,
        totalItems: membersResponse.pagination.totalItems,
        itemsPerPage: membersResponse.pagination.itemsPerPage,
        hasNextPage: membersResponse.pagination.hasNextPage,
        hasPrevPage: membersResponse.pagination.hasPrevPage,
      }
    : null;

  const { data: selectedMember, isLoading: memberLoading } = useMember(
    selectedMemberId || "",
  );

  // Mutations
  const createMemberMutation = useCreateMember();
  const updateMemberMutation = useUpdateMember();

  // Handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handleView = (member: Member) => {
    setSelectedMemberId(member.id);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormOpen(true);
  };

  const handleSubmitMember = async (
    data: CreateMemberData | UpdateMemberData,
  ) => {
    try {
      if (editingMember) {
        await updateMemberMutation.mutateAsync({
          id: editingMember.id,
          data: data as UpdateMemberData,
        });
        toast({ title: "Member updated successfully" });
        setEditingMember(null);
      } else {
        await createMemberMutation.mutateAsync(data as CreateMemberData);
        toast({ title: "Member created successfully" });
      }
      setFormOpen(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : editingMember
            ? "Failed to update member"
            : "Failed to create member";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleFormClose = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingMember(null);
    }
  };

  const isFormLoading =
    createMemberMutation.isPending || updateMemberMutation.isPending;

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(DEFAULT_PAGE);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Members</h1>
        <p className="text-muted-foreground mt-2">
          Manage your customer members for discounts
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by phone, name, or email..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9 w-full sm:w-[300px]"
          />
        </div>

        <MemberForm
          open={formOpen}
          onOpenChange={handleFormClose}
          member={editingMember}
          onSubmit={handleSubmitMember}
          isLoading={isFormLoading}
        />
      </div>

      <MemberTable
        members={members}
        isLoading={membersLoading}
        onView={handleView}
        onEdit={handleEdit}
      />

      {/* Pagination */}
      {membersPagination && (
        <DataTablePagination
          pagination={membersPagination}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          isLoading={membersLoading}
        />
      )}

      {/* Member Detail Dialog */}
      <MemberDetail
        open={!!selectedMemberId}
        onOpenChange={(open) => !open && setSelectedMemberId(null)}
        member={selectedMember || null}
        isLoading={memberLoading}
      />
    </div>
  );
}
