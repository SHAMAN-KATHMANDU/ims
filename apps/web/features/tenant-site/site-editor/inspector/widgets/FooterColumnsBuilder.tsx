"use client";

import { z } from "zod";
import { ArrayBuilder } from "./ArrayBuilder";
import { AutoForm } from "../auto-form/AutoForm";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links?: FooterLink[];
}

const FooterLinkSchema = z.object({
  label: z.string().max(100),
  href: z.string().max(500),
});

export const FooterColumnSchema = z.object({
  title: z.string().max(100),
  links: z.array(FooterLinkSchema).optional(),
});

interface FooterColumnsBuilderProps {
  value: FooterColumn[];
  onChange: (columns: FooterColumn[]) => void;
  label?: string;
}

export function FooterColumnsBuilder({
  value,
  onChange,
  label = "Footer Columns",
}: FooterColumnsBuilderProps) {
  return (
    <div className="space-y-3" data-testid="footer-columns-builder">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <ArrayBuilder<FooterColumn>
        value={value}
        onChange={onChange}
        renderRow={(column, columnIndex) => (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">
                Column Title
              </label>
              <input
                type="text"
                value={column.title}
                onChange={(e) => {
                  const updated = [...value];
                  updated[columnIndex] = { ...column, title: e.target.value };
                  onChange(updated);
                }}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Links
              </label>
              <ArrayBuilder<FooterLink>
                value={column.links || []}
                onChange={(links) => {
                  const updatedColumn = [...value];
                  updatedColumn[columnIndex] = {
                    ...column,
                    links: links,
                  };
                  onChange(updatedColumn);
                }}
                renderRow={(link, linkIndex) => (
                  <AutoForm
                    schema={FooterLinkSchema}
                    values={link}
                    onChange={(fieldName, fieldValue) => {
                      const updatedColumns = [...value];
                      const targetColumn = updatedColumns[columnIndex];
                      if (!targetColumn) return;
                      const columnLinks = targetColumn.links
                        ? [...targetColumn.links]
                        : [];
                      const updatedLink = {
                        ...link,
                        [fieldName]: fieldValue,
                      };
                      columnLinks[linkIndex] = updatedLink;
                      updatedColumns[columnIndex] = {
                        ...column,
                        links: columnLinks,
                      };
                      onChange(updatedColumns);
                    }}
                    blockKind="footer-columns"
                  />
                )}
                renderCollapsedTitle={(link) => link.label || "Link"}
                addLabel="Add link"
                blockKind="footer-columns-link"
              />
            </div>
          </div>
        )}
        renderCollapsedTitle={(column) => column.title || "Column"}
        addLabel="Add column"
        blockKind="footer-columns"
      />
    </div>
  );
}
