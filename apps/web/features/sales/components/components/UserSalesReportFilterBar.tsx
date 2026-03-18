"use client";

/**
 * Filter bar for User Sales Report: date range, sort, type, credit, showroom.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, X, Filter, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { SaleType } from "../../hooks/use-sales";
import type { Location } from "@/features/locations";

export type UserReportSortField =
  | "createdAt"
  | "total"
  | "subtotal"
  | "saleCode";
export type UserReportSortOrder = "asc" | "desc";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "createdAt_desc", label: "Date (newest first)" },
  { value: "createdAt_asc", label: "Date (oldest first)" },
  { value: "total_desc", label: "Total (high to low)" },
  { value: "total_asc", label: "Total (low to high)" },
  { value: "subtotal_desc", label: "Subtotal (high to low)" },
  { value: "subtotal_asc", label: "Subtotal (low to high)" },
  { value: "saleCode_asc", label: "Sale code (A–Z)" },
  { value: "saleCode_desc", label: "Sale code (Z–A)" },
];

const TYPE_OPTIONS: { value: SaleType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Types" },
  { value: "GENERAL", label: "General" },
  { value: "MEMBER", label: "Member" },
];

export interface DateShortcut {
  label: string;
  start?: Date;
  end?: Date;
}

export interface UserSalesReportFilterBarProps {
  sortBy: UserReportSortField;
  sortOrder: UserReportSortOrder;
  onSortChange: (value: string) => void;
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  onClearDates: () => void;
  typeFilter: SaleType | "ALL";
  onTypeChange: (value: string) => void;
  creditFilter: "ALL" | "credit" | "non-credit";
  onCreditChange: (value: string) => void;
  locationFilter: string;
  onLocationChange: (value: string) => void;
  showrooms: Location[];
  dateShortcuts: DateShortcut[];
  onDateShortcut: (start?: Date, end?: Date) => void;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
}

export function UserSalesReportFilterBar({
  sortBy,
  sortOrder,
  onSortChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearDates,
  typeFilter,
  onTypeChange,
  creditFilter,
  onCreditChange,
  locationFilter,
  onLocationChange,
  showrooms,
  dateShortcuts,
  onDateShortcut,
  hasActiveFilters,
  onClearAllFilters,
}: UserSalesReportFilterBarProps) {
  const sortValue = `${sortBy}_${sortOrder}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      <Select value={sortValue} onValueChange={onSortChange}>
        <SelectTrigger className="h-9 w-full sm:w-[200px] shrink-0 gap-2 text-sm">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-sm shrink-0"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(90vw,380px)] max-h-[min(85vh,480px)] overflow-y-auto p-3"
          align="end"
          side="bottom"
          sideOffset={4}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <p className="text-xs font-medium text-muted-foreground col-span-2">
              Type, credit & showroom
            </p>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter} onValueChange={onTypeChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Credit</Label>
              <Select value={creditFilter} onValueChange={onCreditChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Credit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="credit">Credit only</SelectItem>
                  <SelectItem value="non-credit">Non-credit only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Showroom</Label>
              <SearchableSelect
                options={showrooms.map((l) => ({
                  value: l.id,
                  label: l.name,
                }))}
                value={locationFilter}
                onChange={onLocationChange}
                placeholder="Select showroom"
                includeAll
                allLabel="All Showrooms"
                allValue="ALL"
              />
            </div>
            <p className="text-xs font-medium text-muted-foreground col-span-2 pt-1">
              Date range
            </p>
            <div className="col-span-2 flex flex-wrap gap-1.5">
              {dateShortcuts.map(({ label, start, end }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onDateShortcut(start, end)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 w-full justify-start text-left font-normal text-sm",
                      !startDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {startDate ? format(startDate, "MMM d") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={onStartDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 w-full justify-start text-left font-normal text-sm",
                      !endDate && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {endDate ? format(endDate, "MMM d") : "Select"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={onEndDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-full text-xs col-span-2"
                onClick={onClearDates}
              >
                <X className="h-3.5 w-3.5 mr-2" />
                Clear dates
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={onClearAllFilters}
        >
          <X className="h-3.5 w-3.5 mr-2" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
