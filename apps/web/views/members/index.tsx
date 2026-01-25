"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/useToast";
import { useAuthStore, selectIsAdmin } from "@/stores/auth-store";
import {
  useMemberSelectionStore,
  selectSelectedMemberIds,
  selectClearMemberSelection,
} from "@/stores/member-selection-store";
import { downloadMembers } from "@/services/memberService";
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
import { MemberBulkUploadDialog } from "./components/MemberBulkUploadDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";

export function MembersPage() {
  const { toast } = useToast();
  const isAdmin = useAuthStore(selectIsAdmin);
  const canManageMembers = isAdmin;

  // Zustand store for member selection
  const selectedMemberIds = useMemberSelectionStore(selectSelectedMemberIds);
  const clearSelection = useMemberSelectionStore(selectClearMemberSelection);
  const setSelectedMemberIds = useMemberSelectionStore(
    (state) => state.setMembers,
  );

  // Filter state
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadDialog, setBulkUploadDialog] = useState(false);
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

  // Export handlers
  const handleExport = useCallback(
    async (format: "excel" | "csv") => {
      try {
        // Get selected member IDs or undefined (which means export all)
        const memberIdsToExport =
          selectedMemberIds.size > 0
            ? Array.from(selectedMemberIds)
            : undefined;

        // Call backend download endpoint
        await downloadMembers(format, memberIdsToExport);

        const count =
          memberIdsToExport?.length ||
          membersResponse?.pagination?.totalItems ||
          0;
        toast({
          title: "Download started",
          description: `Downloading ${count} member(s) as ${format.toUpperCase()}`,
        });

        // Clear selection after export
        if (selectedMemberIds.size > 0) {
          clearSelection();
        }
      } catch (error: unknown) {
        const err = error as { message?: string };
        toast({
          title: "Download failed",
          description: err.message || "Failed to download members",
          variant: "destructive",
        });
      }
    },
    [
      selectedMemberIds,
      membersResponse?.pagination?.totalItems,
      toast,
      clearSelection,
    ],
  );

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

        <div className="flex items-center gap-2">
          {canManageMembers && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                  {selectedMemberIds.size > 0 && (
                    <span className="ml-2 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                      {selectedMemberIds.size}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleExport("excel")}
                  disabled={membersLoading}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download as Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("csv")}
                  disabled={membersLoading}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canManageMembers && (
            <Button variant="outline" onClick={() => setBulkUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
          )}
          <MemberForm
            open={formOpen}
            onOpenChange={handleFormClose}
            member={editingMember}
            onSubmit={handleSubmitMember}
            isLoading={isFormLoading}
          />
        </div>
      </div>

      <MemberTable
        members={members}
        isLoading={membersLoading}
        onView={handleView}
        onEdit={handleEdit}
        // Selection props
        selectedMembers={selectedMemberIds}
        onSelectionChange={setSelectedMemberIds}
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

      <MemberBulkUploadDialog
        open={bulkUploadDialog}
        onOpenChange={setBulkUploadDialog}
      />
    </div>
  );
}
