"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useAuthStore, selectIsAdmin } from "@/store/auth-store";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useMemberSelectionStore,
  selectSelectedMemberIds,
  selectClearMemberSelection,
} from "@/store/member-selection-store";
import { downloadMembers } from "../services/member.service";
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
} from "../hooks/use-members";
import type { MemberStatusFilter } from "../services/member.service";
import { useIsMobile } from "@/hooks/useMobile";
import { MemberTable } from "./components/MemberTable";
import { MemberForm } from "./components/MemberForm";
import { MemberDetail } from "./components/MemberDetail";
import { MemberBulkUploadDialog } from "./components/MemberBulkUploadDialog";
import { EnvFeatureGuard, FeatureGuard } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
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

export function MembersPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const isAdmin = useAuthStore(selectIsAdmin);
  const canManageMembers = isAdmin;
  const isMobile = useIsMobile();

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
  const debouncedSearch = useDebounce(search, 300);
  const [memberStatusFilter, setMemberStatusFilter] = useState<
    MemberStatusFilter | "all"
  >("all");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const MEMBER_STATUS_OPTIONS: {
    value: MemberStatusFilter | "all";
    label: string;
  }[] = [
    { value: "all", label: "All statuses" },
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "PROSPECT", label: "Prospect" },
    { value: "VIP", label: "VIP" },
  ];

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadDialog, setBulkUploadDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Clear filters
  const clearAllFilters = useCallback(() => {
    setSearch("");
    setMemberStatusFilter("all");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(DEFAULT_PAGE);
  }, []);
  const hasActiveFilters =
    search !== "" ||
    memberStatusFilter !== "all" ||
    sortBy !== "createdAt" ||
    sortOrder !== "desc";

  // Data fetching with backend sorting
  const { data: membersResponse, isLoading: membersLoading } =
    useMembersPaginated({
      page,
      limit: pageSize,
      search: debouncedSearch,
      memberStatus:
        memberStatusFilter === "all" ? undefined : memberStatusFilter,
      sortBy,
      sortOrder,
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
  const handleMemberStatusChange = useCallback((value: string) => {
    setMemberStatusFilter(value as MemberStatusFilter | "all");
    setPage(DEFAULT_PAGE);
  }, []);

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
    if (isMobile) {
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

  const handleSortChange = useCallback((value: string) => {
    // Same `field_order` convention as products sort Select (underscore; last segment is asc|desc).
    const i = value.lastIndexOf("_");
    const field = i === -1 ? value : value.slice(0, i);
    const order = (i === -1 ? "desc" : value.slice(i + 1)) as "asc" | "desc";
    setSortBy(field);
    setSortOrder(order);
    setPage(DEFAULT_PAGE);
  }, []);

  const handleColumnSort = useCallback(
    (newSortBy: string, newSortOrder: "asc" | "desc" | "none") => {
      if (newSortOrder === "none") {
        setSortBy("createdAt");
        setSortOrder("desc");
      } else {
        setSortBy(newSortBy);
        setSortOrder(newSortOrder);
      }
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
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-bold">Members</h1>
        <p className="text-muted-foreground mt-2">
          Manage your customer members for discounts
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Search members by phone, name, or email"
              placeholder="Search by phone, name, or email..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9 w-full sm:w-[300px]"
            />
          </div>
          <Select
            value={memberStatusFilter}
            onValueChange={handleMemberStatusChange}
          >
            <SelectTrigger
              className="h-9 w-[160px] shrink-0 gap-2 text-sm"
              aria-label="Filter by member status"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {MEMBER_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={`${sortBy}_${sortOrder}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger
              className="h-9 w-[200px] shrink-0 gap-2 text-sm"
              aria-label="Sort members"
            >
              <ArrowUpDown
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt_desc">
                Date (newest first)
              </SelectItem>
              <SelectItem value="createdAt_asc">Date (oldest first)</SelectItem>
              <SelectItem value="name_asc">Name (A–Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z–A)</SelectItem>
              <SelectItem value="phone_asc">Phone (A–Z)</SelectItem>
              <SelectItem value="phone_desc">Phone (Z–A)</SelectItem>
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
              <X className="h-3.5 w-3.5 mr-2" aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canManageMembers && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
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
                  <FileSpreadsheet
                    className="h-4 w-4 mr-2"
                    aria-hidden="true"
                  />
                  Download as Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("csv")}
                  disabled={membersLoading}
                >
                  <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                  Download as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {canManageMembers && (
            <EnvFeatureGuard envFeature={EnvFeature.BULK_UPLOAD_PRODUCTS}>
              <FeatureGuard feature={Feature.BULK_UPLOAD_PRODUCTS}>
                {isMobile ? (
                  <Button variant="outline" asChild>
                    <Link href={`${basePath}/members/bulk-upload`}>
                      <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                      Bulk Upload
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setBulkUploadDialog(true)}
                  >
                    <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                    Bulk Upload
                  </Button>
                )}
              </FeatureGuard>
            </EnvFeatureGuard>
          )}
          {canManageMembers &&
            (isMobile ? (
              <Button asChild>
                <Link href={`${basePath}/members/new`} className="gap-2">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add Member
                </Link>
              </Button>
            ) : (
              <MemberForm
                open={formOpen}
                onOpenChange={handleFormClose}
                member={editingMember}
                onSubmit={handleSubmitMember}
                isLoading={isFormLoading}
              />
            ))}
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
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearAllFilters}
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

      {/* Sticky bulk action bar when items selected */}
      {selectedMemberIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 py-3 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <span className="text-sm font-medium">
              {selectedMemberIds.size} item
              {selectedMemberIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              {canManageMembers && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm">
                      <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                      Download
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleExport("excel")}
                      disabled={membersLoading}
                    >
                      <FileSpreadsheet
                        className="h-4 w-4 mr-2"
                        aria-hidden="true"
                      />
                      Download as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport("csv")}
                      disabled={membersLoading}
                    >
                      <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                      Download as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={clearSelection}
                className="shrink-0"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
