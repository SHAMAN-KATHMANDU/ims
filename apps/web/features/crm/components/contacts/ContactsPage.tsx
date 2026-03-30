"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useContactsPaginated,
  useContact,
  useDeleteContact,
  useImportContacts,
  exportContactsCsv,
  useCreateContact,
  useUpdateContact,
} from "../../hooks/use-contacts";
import { useCompaniesForSelect } from "../../hooks/use-companies";
import { useContactTags } from "../../hooks/use-contacts";
import {
  useCrmSources,
  useCrmJourneyTypes,
} from "../../hooks/use-crm-settings";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CompanyCombobox } from "./CompanyCombobox";
import { TagCombobox } from "./TagCombobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Upload, Download } from "lucide-react";
import {
  DataTablePagination,
  type PaginationState,
} from "@/components/ui/data-table-pagination";
import { downloadBlob } from "@/lib/downloadBlob";
import { useEnvFeatureFlag, useFeatureFlag } from "@/features/flags";
import { EnvFeature } from "@/features/flags";
import { Feature } from "@repo/shared";
import { ContactTable } from "./ContactTable";
import { ContactDetail } from "./ContactDetail";
import { ContactForm } from "./ContactForm";
import { ContactImportDialog } from "./ContactImportDialog";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
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
import type { CreateContactData } from "../../services/contact.service";

type DrawerMode = "view" | "new" | "edit" | null;

export function ContactsPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const isDesktop = useIsDesktop();
  const envDealsEnabled = useEnvFeatureFlag(EnvFeature.CRM_DEALS);
  const salesPipelinePlan = useFeatureFlag(Feature.SALES_PIPELINE);
  const dealsEnabled = envDealsEnabled && salesPipelinePlan;

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [sortBy] = useState("createdAt");
  const [sortOrder] = useState<"asc" | "desc">("desc");
  const [companyId, setCompanyId] = useState<string>("");
  const [tagId, setTagId] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [journeyTypeFilter, setJourneyTypeFilter] = useState<string>("all");
  const [importOpen, setImportOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<1 | 2>(1);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");

  const { data, isLoading } = useContactsPaginated({
    page,
    limit: pageSize,
    search: debouncedSearch,
    sortBy,
    sortOrder,
    companyId: companyId || undefined,
    tagId: tagId || undefined,
    source: sourceFilter === "all" ? undefined : sourceFilter,
    journeyType: journeyTypeFilter === "all" ? undefined : journeyTypeFilter,
  });

  const { data: contactData } = useContact(selectedId || "");
  const { data: contactToDeleteData } = useContact(deleteId || "");
  const { data: companiesData } = useCompaniesForSelect();
  const { data: tagsData } = useContactTags();
  const { data: sourcesData } = useCrmSources();
  const { data: journeyTypesData } = useCrmJourneyTypes();
  const companies = companiesData?.companies ?? [];
  const tags = tagsData?.tags ?? [];
  const sources = sourcesData?.sources ?? [];
  const journeyTypes = journeyTypesData?.journeyTypes ?? [];
  const deleteMutation = useDeleteContact();
  const importMutation = useImportContacts();
  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();

  const contacts = data?.data ?? [];
  const pagination = data?.pagination
    ? ({
        currentPage: data.pagination.currentPage,
        totalPages: data.pagination.totalPages,
        totalItems: data.pagination.totalItems,
        itemsPerPage: data.pagination.itemsPerPage,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage,
      } as PaginationState)
    : null;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(DEFAULT_PAGE);
    },
    [],
  );

  const handleExport = async () => {
    try {
      const blob = await exportContactsCsv();
      downloadBlob(blob, `contacts-${Date.now()}.xlsx`);
      toast({ title: "Export started" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleImportSuccess = () => {
    setImportOpen(false);
    toast({ title: "Contacts imported successfully" });
  };

  const openNew = () => {
    if (isDesktop) {
      setSelectedId(null);
      setDrawerMode("new");
    } else {
      router.push(`${basePath}/crm/contacts/new`);
    }
  };

  const openView = (id: string) => {
    if (isDesktop) {
      setSelectedId(id);
      setDrawerMode("view");
    } else {
      router.push(`${basePath}/crm/contacts/${id}`);
    }
  };

  const openEdit = (id: string) => {
    if (isDesktop) {
      setSelectedId(id);
      setDrawerMode("edit");
    } else {
      router.push(`${basePath}/crm/contacts/${id}/edit`);
    }
  };

  const closeDrawer = () => {
    setDrawerMode(null);
    setSelectedId(null);
  };

  const contactToDelete = contactToDeleteData?.contact;
  const contactDisplayName =
    contactToDelete != null
      ? [contactToDelete.firstName, contactToDelete.lastName]
          .filter(Boolean)
          .join(" ") || "this contact"
      : "";
  const dealCount = contactToDelete?.deals?.length ?? 0;
  const taskCount = contactToDelete?.tasks?.length ?? 0;
  const deleteImpactSummary = (() => {
    const parts: string[] = [];
    if (dealsEnabled) {
      parts.push(`${dealCount} deal${dealCount !== 1 ? "s" : ""}`);
    }
    parts.push(`${taskCount} task${taskCount !== 1 ? "s" : ""}`);
    return parts.join(" and ");
  })();
  const canConfirmDelete =
    deleteConfirmStep === 2 &&
    deleteConfirmName.trim().toLowerCase() ===
      contactDisplayName.trim().toLowerCase();

  const openDeleteDialog = (id: string) => {
    setDeleteId(id);
    setDeleteConfirmStep(1);
    setDeleteConfirmName("");
  };

  const closeDeleteDialog = () => {
    setDeleteId(null);
    setDeleteConfirmStep(1);
    setDeleteConfirmName("");
  };

  const confirmDeleteStep1 = () => setDeleteConfirmStep(2);

  const confirmDelete = () => {
    if (!deleteId) return;
    if (deleteConfirmStep === 1) {
      confirmDeleteStep1();
      return;
    }
    if (!canConfirmDelete) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: "Contact deleted" });
        if (selectedId === deleteId) closeDrawer();
        closeDeleteDialog();
      },
      onError: () => {
        toast({ title: "Delete failed", variant: "destructive" });
        closeDeleteDialog();
      },
    });
  };

  const handleCreateContact = async (data: CreateContactData) => {
    await createMutation.mutateAsync(data);
    toast({ title: "Contact created" });
    closeDrawer();
  };

  const handleUpdateContact = async (data: CreateContactData) => {
    if (!selectedId) return;
    await updateMutation.mutateAsync({ id: selectedId, data });
    toast({ title: "Contact updated" });
    setDrawerMode("view");
  };

  const drawerTitle =
    drawerMode === "new"
      ? "New Contact"
      : drawerMode === "edit"
        ? "Edit Contact"
        : "Contact Details";

  const drawerOpen = drawerMode !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Contacts</h1>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        <CompanyCombobox
          companies={companies}
          value={companyId}
          onValueChange={(v) => {
            setCompanyId(v);
            setPage(DEFAULT_PAGE);
          }}
        />
        <TagCombobox
          tags={tags}
          value={tagId}
          onValueChange={(v) => {
            setTagId(v);
            setPage(DEFAULT_PAGE);
          }}
        />
        <Select
          value={sourceFilter}
          onValueChange={(v) => {
            setSourceFilter(v);
            setPage(DEFAULT_PAGE);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s.id} value={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={journeyTypeFilter}
          onValueChange={(v) => {
            setJourneyTypeFilter(v);
            setPage(DEFAULT_PAGE);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Journey type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All journey types</SelectItem>
            {journeyTypes.map((jt) => (
              <SelectItem key={jt.id} value={jt.name}>
                {jt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ContactTable
        contacts={contacts}
        isLoading={isLoading}
        basePath={basePath}
        dealsEnabled={dealsEnabled}
        onView={openView}
        onEdit={openEdit}
        onDelete={(id) => openDeleteDialog(id)}
      />

      {pagination && (
        <DataTablePagination
          pagination={pagination}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(DEFAULT_PAGE);
          }}
        />
      )}

      <ResponsiveDrawer
        open={drawerOpen}
        onOpenChange={(o) => !o && closeDrawer()}
        title={drawerTitle}
        size="2xl"
        bodyPadding={false}
      >
        {drawerMode === "view" && selectedId && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-end px-6 py-3 border-b shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEdit(selectedId)}
              >
                Edit Contact
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ContactDetail
                contactId={selectedId}
                contact={contactData?.contact}
                basePath={basePath}
                onClose={closeDrawer}
              />
            </div>
          </div>
        )}
        {drawerMode === "new" && (
          <ContactForm
            onSubmit={handleCreateContact}
            onCancel={closeDrawer}
            isLoading={createMutation.isPending}
          />
        )}
        {drawerMode === "edit" && selectedId && (
          <ContactForm
            defaultValues={
              contactData?.contact
                ? {
                    firstName: contactData.contact.firstName,
                    lastName: contactData.contact.lastName ?? undefined,
                    email: contactData.contact.email ?? undefined,
                    phone: contactData.contact.phone ?? undefined,
                    companyId: contactData.contact.companyId ?? undefined,
                    source: contactData.contact.source ?? undefined,
                    journeyType: contactData.contact.journeyType ?? undefined,
                    tagIds:
                      contactData.contact.tagLinks?.map((tl) => tl.tag.id) ??
                      [],
                  }
                : undefined
            }
            onSubmit={handleUpdateContact}
            onCancel={() => setDrawerMode("view")}
            isLoading={updateMutation.isPending}
          />
        )}
      </ResponsiveDrawer>

      <ContactImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={handleImportSuccess}
        mutation={importMutation}
      />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && closeDeleteDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirmStep === 1
                ? "Delete this contact?"
                : "Confirm deletion"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmStep === 1 ? (
                <>
                  Are you sure you want to delete{" "}
                  <strong>{contactDisplayName || "this contact"}</strong>? This
                  will affect {deleteImpactSummary}. Incomplete tasks will be
                  marked as done.
                </>
              ) : (
                <>
                  Type <strong>{contactDisplayName}</strong> below to confirm
                  deletion.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteConfirmStep === 2 && (
            <Input
              placeholder="Contact name"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              className="mt-2"
              autoFocus
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={
                deleteMutation.isPending ||
                (deleteConfirmStep === 2 && !canConfirmDelete)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteConfirmStep === 1 ? "Continue" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
