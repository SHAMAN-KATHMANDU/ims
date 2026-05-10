"use client";

import { useRouter, useParams } from "next/navigation";
import { useTemplatesQuery } from "../hooks/use-templates";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function PlatformTemplatesView() {
  const router = useRouter();
  const params = useParams<{ workspace: string }>();
  const workspace = params?.workspace ?? "";
  const templatesQuery = useTemplatesQuery();

  if (templatesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  // Filter for canonical templates only (ownerTenantId IS NULL)
  const canonicalTemplates =
    templatesQuery.data?.filter((t) => t.ownerTenantId === null) ?? [];

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif text-gray-900">Templates</h1>
        <p className="text-gray-600 mt-2">
          Manage canonical templates for all tenants.
        </p>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {canonicalTemplates.length > 0 ? (
              canonicalTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="text-gray-600">
                    {template.slug}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {template.category ?? "-"}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {new Date(template.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        router.push(
                          workspace
                            ? `/${workspace}/platform/templates/${template.id}/edit`
                            : "/",
                        )
                      }
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-gray-600"
                >
                  No canonical templates found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
