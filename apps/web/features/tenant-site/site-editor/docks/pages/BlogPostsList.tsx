"use client";

import React from "react";

interface BlogPostsListProps {
  search: string;
}

export function BlogPostsList({ search }: BlogPostsListProps) {
  // TODO: Wire useBlogPostsQuery hook to list blog posts
  // For now, show empty state with inline create action

  return (
    <div className="px-3 py-4 text-center">
      <p className="text-sm text-gray-500 mb-3">No blog posts yet</p>
      <button className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-sm font-medium transition-colors">
        Create first post
      </button>
    </div>
  );
}
