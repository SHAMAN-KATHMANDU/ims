"use client";

import type { Contact } from "../../services/contact.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone, Eye, Edit, Trash2 } from "lucide-react";
import type { SortOrder } from "@/components/ui/table";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Can } from "@/features/permissions";
import { getActiveJourneyType } from "../../utils/journey-type";

type ContactEmptyVariant = "empty" | "no-results";

interface ContactTableProps {
  contacts: Contact[];
  isLoading: boolean;
  /** Background refetch — table stays visible with dimmed state */
  isFetching?: boolean;
  basePath: string;
  dealsEnabled: boolean;
  sortBy: string;
  sortOrder: SortOrder;
  onSort: (sortBy: string, sortOrder: "asc" | "desc" | "none") => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  emptyVariant?: ContactEmptyVariant;
  onClearFilters?: () => void;
}

export function ContactTable({
  contacts,
  isLoading,
  isFetching = false,
  basePath: _basePath,
  dealsEnabled,
  sortBy,
  sortOrder,
  onSort,
  onView,
  onEdit,
  onDelete,
  emptyVariant = "empty",
  onClearFilters,
}: ContactTableProps) {
  // Build columns array, filtering based on dealsEnabled
  const baseColumns: DataTableColumn<Contact>[] = [
    {
      id: "name",
      header: "Name",
      sortKey: "firstName",
      cell: (c) => {
        const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ");
        return fullName || "—";
      },
    },
    {
      id: "email",
      header: "Email",
      sortKey: "email",
      cell: (c) => c.email || "—",
    },
    {
      id: "phone",
      header: "Phone",
      sortKey: "phone",
      cell: (c) => c.phone || "—",
    },
    {
      id: "company",
      header: "Company",
      sortKey: "companyId",
      cell: (c) => c.company?.name || "—",
    },
    {
      id: "tags",
      header: "Tags",
      cell: (c) =>
        c.tagLinks && c.tagLinks.length > 0
          ? c.tagLinks.map((l) => l.tag.name).join(", ")
          : "—",
    },
  ];

  // Conditionally add dealsEnabled column
  const columns = dealsEnabled
    ? [
        ...baseColumns,
        {
          id: "dealStage",
          header: "Deal Stage",
          cell: (c) => {
            const activeJourneyType = getActiveJourneyType(c.deals);
            return activeJourneyType ? (
              <Badge variant="outline" className="text-xs">
                {activeJourneyType}
              </Badge>
            ) : (
              "—"
            );
          },
        } as DataTableColumn<Contact>,
      ]
    : baseColumns;

  const hasActiveFilters = emptyVariant === "no-results";

  return (
    <DataTable<Contact>
      data={contacts}
      columns={columns}
      getRowKey={(c) => c.id}
      isLoading={isLoading}
      skeletonRows={5}
      sort={{
        sortBy,
        sortOrder,
        onSort,
      }}
      emptyState={{
        title: hasActiveFilters
          ? "No contacts match your search or filters"
          : "No contacts yet",
        description: hasActiveFilters
          ? "Try different keywords or clear filters to see everyone."
          : "Add a contact or import a list to get started.",
        action:
          hasActiveFilters && onClearFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearFilters}
            >
              Clear filters
            </Button>
          ) : undefined,
      }}
      renderMobileCard={(c) => {
        const activeJourneyType = getActiveJourneyType(c.deals);
        const fullName = [c.firstName, c.lastName].filter(Boolean).join(" ");
        return (
          <div className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <button
                onClick={() => onView(c.id)}
                className="text-sm font-semibold text-left hover:text-primary transition-colors"
              >
                {fullName}
              </button>
              {dealsEnabled && activeJourneyType && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {activeJourneyType}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {c.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" aria-hidden="true" />
                  {c.email}
                </span>
              )}
              {c.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  {c.phone}
                </span>
              )}
              {c.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" aria-hidden="true" />
                  {c.company.name}
                </span>
              )}
            </div>

            {c.tagLinks && c.tagLinks.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {c.tagLinks.map((l) => (
                  <Badge key={l.tag.id} variant="secondary" className="text-xs">
                    {l.tag.name}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-1 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => onView(c.id)}
              >
                View
              </Button>
              <Can perm="CRM.CONTACTS.UPDATE">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => onEdit(c.id)}
                >
                  Edit
                </Button>
              </Can>
              <Can perm="CRM.CONTACTS.DELETE">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1 text-destructive hover:text-destructive"
                  onClick={() => onDelete(c.id)}
                >
                  Delete
                </Button>
              </Can>
            </div>
          </div>
        );
      }}
      mobileBreakpoint="sm"
      rowClassName={
        isFetching && !isLoading
          ? "opacity-70 transition-opacity duration-[var(--duration-normal,200ms)]"
          : "transition-opacity duration-[var(--duration-normal,200ms)]"
      }
      actions={(c) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onView(c.id)}
            aria-label={`View ${c.firstName} ${c.lastName}`}
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Can perm="CRM.CONTACTS.UPDATE">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(c.id)}
              aria-label={`Edit ${c.firstName} ${c.lastName}`}
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Can>
          <Can perm="CRM.CONTACTS.DELETE">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(c.id)}
              aria-label={`Delete ${c.firstName} ${c.lastName}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Can>
        </div>
      )}
      className="rounded-md border overflow-x-auto"
      tableClassName="min-w-[640px]"
    />
  );
}
