import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

export interface TableSkeletonProps {
  /** Number of skeleton rows. Default 5. */
  rows?: number;
  /** Required — must match the real table's column count. */
  columns: number;
  /** Optional per-row className applied to every skeleton row. */
  rowClassName?: string;
}

/**
 * Renders `rows × columns` skeleton cells. Caller owns the surrounding
 * `<Table>` + `<TableHeader>` — this renders only `<TableRow>`s so it can drop
 * into a real table's body and keep column widths identical.
 */
export function TableSkeleton({
  rows = 5,
  columns,
  rowClassName,
}: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className={rowClassName}>
          {Array.from({ length: columns }).map((__, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
