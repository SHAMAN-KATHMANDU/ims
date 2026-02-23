"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useAuthStore, selectIsAdmin } from "@/stores/auth-store";
import {
  useMemberSelectionStore,
  selectSelectedMemberIds,
  selectClearMemberSelection,
} from "@/stores/member-selection-store";
import { downloadMembers } from "@/services/memberService";
import { LimitGuard } from "@/components/limit-guard";
import {
  useMembersPaginated,
  useMember,
  useCreateMember,
  useUpdateMember,
  type Member,
  type CreateMemberData,
  type UpdateMemberData,
  type MemberListParams,
  type PaginatedMembersResponse,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  Plus,
  ArrowUpDown,
  X,
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

export interface MembersPageClientProps {
  initialData?: PaginatedMembersResponse;
  initialParams?: MemberListParams;
}

export function MembersPageClient({
  initialData,
  initialParams,
}: MembersPageClientProps = {}) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const isAdmin = useAuthStore(selectIsAdmin);
  const canManageMembers = isAdmin;

  // Zustand store for member selection
  const selectedMemberIds = useMemberSelectionStore(selectSelectedMemberIds);
  const clearSelection = useMemberSelectionStore(selectClearMemberSelection);
  const setSelectedMemberIds = useMemberSelectionStore(
    (state) => state.setMembers,
  );

  // Filter state (initialize from server params when provided)
  const [page, setPage] = useState(initialParams?.page ?? DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(
    initialParams?.limit ?? DEFAULT_LIMIT,
  );
  const [search, setSearch] = useState(initialParams?.search ?? "");
  const [sortBy, setSortBy] = useState<
    "createdAt" | "updatedAt" | "name" | "id"
  >(
    (initialParams?.sortBy as "createdAt" | "updatedAt" | "name" | "id") ??
      "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    initialParams?.sortOrder ?? "desc",
  );

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadDialog, setBulkUploadDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Clear filters
  const clearAllFilters = useCallback(() => {
    setSearch("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(DEFAULT_PAGE);
  }, []);
  const hasActiveFilters =
    search !== "" || sortBy !== "createdAt" || sortOrder !== "desc";

  // Data fetching with backend sorting
  const { data: membersResponse, isLoading: membersLoading } =
    useMembersPaginated(
      {
        page,
        limit: pageSize,
        search,
        sortBy,
        sortOrder,
      },
      { initialData },
    );

  const members = useMemo(() => membersResponse?.data ?? [], [membersResponse]);

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
    const isNarrowScreen =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches;
    if (isNarrowScreen) {
      router.push(`${basePath}/members/${member.id}/edit`);
      return;
    }
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

  useEffect(() => {
    const isNarrowScreen =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches;
    if (isNarrowScreen) return;
    const add = searchParams.get("add");
    const edit = searchParams.get("edit");
    if (add === "1") {
      setEditingMember(null);
      setFormOpen(true);
      return;
    }
    if (edit) {
      const member = members.find((m) => m.id === edit);
      if (member) {
        setEditingMember(member);
        setFormOpen(true);
      }
    }
  }, [searchParams, members]);

  const handleSortChange = useCallback((value: string) => {
    const [field, order] = value.split("_") as [
      "createdAt" | "updatedAt" | "name" | "id",
      "asc" | "desc",
    ];
    setSortBy(field);
    setSortOrder(order);
    setPage(DEFAULT_PAGE);
  }, []);

  const handleColumnSort = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc") => {
      setSortBy(newSortBy as "createdAt" | "updatedAt" | "name" | "id");
      setSortOrder(newSortOrder);
      setPage(DEFAULT_PAGE);
    },
    [],
  );

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
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by phone, name, or email..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-9 sm:w-[300px]"
            />
          </div>
          <Select
            value={`${sortBy}_${sortOrder}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="h-9 w-full gap-2 text-sm sm:w-[200px]">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt_desc">
                Date (newest first)
              </SelectItem>
              <SelectItem value="createdAt_asc">Date (oldest first)</SelectItem>
              <SelectItem value="name_asc">Name (A–Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z–A)</SelectItem>
              <SelectItem value="updatedAt_desc">
                Updated (newest first)
              </SelectItem>
              <SelectItem value="updatedAt_asc">
                Updated (oldest first)
              </SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={clearAllFilters}
            >
              <X className="h-3.5 w-3.5 mr-2" />
              Clear filters
            </Button>
          )}
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
            <>
              <Button variant="outline" asChild className="md:hidden">
                <Link href={`${basePath}/members/bulk-upload`}>
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => setBulkUploadDialog(true)}
                className="hidden md:inline-flex"
              >
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </>
          )}
          {canManageMembers && (
            <LimitGuard resource="members">
              <Button asChild className="md:hidden">
                <Link href={`${basePath}/members/new`} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Member
                </Link>
              </Button>
              <div className="hidden md:block">
                <MemberForm
                  open={formOpen}
                  onOpenChange={handleFormClose}
                  member={editingMember}
                  onSubmit={handleSubmitMember}
                  isLoading={isFormLoading}
                />
              </div>
            </LimitGuard>
          )}
        </div>
      </div>

      <MemberTable
        members={members}
        isLoading={membersLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleColumnSort}
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

/** Re-export for backward compatibility. Will pass initialData when page becomes server component. */
export function MembersPage(props: MembersPageClientProps) {
  return <MembersPageClient {...props} />;
}
