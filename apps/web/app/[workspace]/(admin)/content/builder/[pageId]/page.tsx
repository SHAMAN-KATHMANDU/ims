export const metadata = { title: "Page Builder — CMS" };

interface PageProps {
  params: Promise<{
    pageId: string;
  }>;
}

export default async function BuilderPage({ params }: PageProps) {
  const { pageId } = await params;

  return (
    <div
      className="flex h-full items-center justify-center"
      style={{ color: "var(--ink-3)" }}
    >
      <div className="text-center">
        <p className="serif text-xl">Page Builder {pageId}</p>
        <p className="mt-2 text-sm">Coming soon — owned by Task #5</p>
      </div>
    </div>
  );
}
