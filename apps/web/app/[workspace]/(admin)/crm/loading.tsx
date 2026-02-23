import { Skeleton } from "@/components/ui/skeleton";

export default function CrmLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="rounded-lg border p-6">
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
