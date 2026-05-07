"use client";

import React from "react";

interface CustomPagesListProps {
  search: string;
}

export function CustomPagesList({ search }: CustomPagesListProps) {
  // TODO: Wire usePagesQuery hook to list custom pages
  // For now, show empty state with inline create action

  return (
    <div className="px-3 py-4 text-center">
      <p className="text-sm text-gray-500 mb-3">No custom pages yet</p>
      <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-medium transition-colors">
        Create first page
      </button>
    </div>
  );
}
