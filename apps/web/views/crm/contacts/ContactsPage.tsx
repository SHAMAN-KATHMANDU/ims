"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import {
  useContactsPaginated,
  useContact,
  useDeleteContact,
  useImportContacts,
  exportContactsCsv,
  useCreateContact,
  useUpdateContact,
} from "@/hooks/useContacts";
import { useCompaniesForSelect } from "@/hooks/useCompanies";
import { useContactTags } from "@/hooks/useContacts";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { DEFAULT_PAGE, DEFAULT_LIMIT } from "@/lib/apiTypes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { ContactTable } from "./ContactTable";
import { ContactDetail } from "./ContactDetail";
import { ContactForm } from "./ContactForm";
import { ContactImportDialog } from "./ContactImportDialog";
import { ResponsiveDrawer } from "@/components/ui/responsive-drawer";
import type { CreateContactData } from "@/services/contactService";

type DrawerMode = "view" | "new" | "edit" | null;

export function ContactsPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();
  const isDesktop = useIsDesktop();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [sortBy] = useState("createdAt");
  const [sortOrder] = useState<"asc" | "desc">("desc");
  const [companyId, setCompanyId] = useState<string>("");
  const [tagId, setTagId] = useState<string>("");
  const [importOpen, setImportOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);

  const { data, isLoading } = useContactsPaginated({
    page,
    limit: pageSize,
    search,
    sortBy,
    sortOrder,
    companyId: companyId || undefined,
    tagId: tagId || undefined,
  });

  const { data: contactData } = useContact(selectedId || "");
  const { data: companiesData } = useCompaniesForSelect();
  const { data: tagsData } = useContactTags();
  const companies = companiesData?.companies ?? [];
  const tags = tagsData?.tags ?? [];
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
        <Select
          value={companyId || "__all__"}
          onValueChange={(v) => {
            setCompanyId(v === "__all__" ? "" : v);
            setPage(DEFAULT_PAGE);
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={tagId || "__all__"}
          onValueChange={(v) => {
            setTagId(v === "__all__" ? "" : v);
            setPage(DEFAULT_PAGE);
          }}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All tags</SelectItem>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ContactTable
        contacts={contacts}
        isLoading={isLoading}
        basePath={basePath}
        onView={openView}
        onEdit={openEdit}
        onDelete={(id) => {
          if (confirm("Delete this contact?")) {
            deleteMutation.mutate(id, {
              onSuccess: () => {
                toast({ title: "Contact deleted" });
                if (selectedId === id) closeDrawer();
              },
              onError: () =>
                toast({ title: "Delete failed", variant: "destructive" }),
            });
          }
        }}
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
    </div>
  );
}
