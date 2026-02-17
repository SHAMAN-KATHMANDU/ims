"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import {
  useContactsPaginated,
  useContact,
  useDeleteContact,
  useImportContacts,
  exportContactsCsv,
} from "@/hooks/useContacts";
import { useCompaniesForSelect } from "@/hooks/useCompanies";
import { useContactTags } from "@/hooks/useContacts";
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
import { ContactImportDialog } from "./ContactImportDialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function ContactsPage() {
  const params = useParams();
  const router = useRouter();
  const workspace = (params?.workspace as string) ?? "admin";
  const basePath = `/${workspace}`;
  const { toast } = useToast();

  const [page, setPage] = useState(DEFAULT_PAGE);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState("");
  const [sortBy] = useState("createdAt");
  const [sortOrder] = useState<"asc" | "desc">("desc");
  const [companyId, setCompanyId] = useState<string>("");
  const [tagId, setTagId] = useState<string>("");
  const [importOpen, setImportOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Contacts</h1>
        <div className="flex gap-2">
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
          <Link href={`${basePath}/crm/contacts/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </Link>
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
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[160px]">
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
        onView={(id) => setSelectedId(id)}
        onEdit={(id) => router.push(`${basePath}/crm/contacts/${id}/edit`)}
        onDelete={(id) => {
          if (confirm("Delete this contact?")) {
            deleteMutation.mutate(id, {
              onSuccess: () => {
                toast({ title: "Contact deleted" });
                if (selectedId === id) setSelectedId(null);
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

      <Sheet
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Contact Details</SheetTitle>
          </SheetHeader>
          {selectedId && (
            <ContactDetail
              contactId={selectedId}
              contact={contactData?.contact}
              basePath={basePath}
              onClose={() => setSelectedId(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      <ContactImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={handleImportSuccess}
        mutation={importMutation}
      />
    </div>
  );
}
