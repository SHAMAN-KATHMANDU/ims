"use client";

/**
 * Shared filter bar for all analytics pages. State is URL-based via useAnalyticsFilters
 * so filters are shareable and consistent across Sales & Revenue, Inventory & Ops, Customers & Promos.
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useAnalyticsFilters,
  ANALYTICS_PRESETS,
  type AnalyticsSaleType,
  type AnalyticsCreditStatus,
} from "@/hooks/useAnalyticsFilters";
import { useActiveLocations } from "@/hooks/useLocation";
import { useUsers } from "@/hooks/useUser";
import { useCategories } from "@/hooks/useProduct";
import { useVendorsPaginated } from "@/hooks/useVendors";
import { useAuthStore, selectIsAdmin } from "@/stores/auth-store";
import type { User } from "@/services/userService";

export function AnalyticsFilterBar() {
  const { filters, setFilters, setPreset, setDateRange } = useAnalyticsFilters();
  const isAdmin = useAuthStore(selectIsAdmin);
  const { data: locations = [] } = useActiveLocations();
  const { data: users = [] } = useUsers({ limit: 500 });
  const { data: categories = [] } = useCategories();
  const { data: vendorsData } = useVendorsPaginated({ limit: 500 });
  const vendors = vendorsData?.data ?? [];
  const allLocations = locations;

  const handleLocationToggle = (locationId: string, checked: boolean) => {
    const next = checked
      ? [...filters.locationIds, locationId]
      : filters.locationIds.filter((id) => id !== locationId);
    setFilters({ locationIds: next });
  };

  const startDate = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
  const endDate = filters.dateTo ? new Date(filters.dateTo) : undefined;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2 text-sm shrink-0">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-3" align="start">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Date range</p>
            <div className="flex flex-wrap gap-1.5">
              {ANALYTICS_PRESETS.map(({ id, label }) => (
                <Button
                  key={id}
                  variant={filters.preset === id ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPreset(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
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
                      onSelect={(d) =>
                        d && setDateRange(format(d, "yyyy-MM-dd"), filters.dateTo ?? format(d, "yyyy-MM-dd"))
                      }
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
                      onSelect={(d) =>
                        d && setDateRange(filters.dateFrom ?? format(d, "yyyy-MM-dd"), format(d, "yyyy-MM-dd"))
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <p className="text-xs font-medium text-muted-foreground pt-2">Location</p>
            <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-2">
              {allLocations.length === 0 ? (
                <p className="text-xs text-muted-foreground">No locations</p>
              ) : (
                allLocations.map((loc) => (
                  <div key={loc.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`loc-${loc.id}`}
                      checked={filters.locationIds.includes(loc.id)}
                      onCheckedChange={(checked) =>
                        handleLocationToggle(loc.id, checked === true)
                      }
                    />
                    <label
                      htmlFor={`loc-${loc.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {loc.name}
                    </label>
                  </div>
                ))
              )}
            </div>

            <p className="text-xs font-medium text-muted-foreground pt-1">Sale type</p>
            <Select
              value={filters.saleType ?? "all"}
              onValueChange={(v) =>
                setFilters({
                  saleType: v === "all" ? undefined : (v as AnalyticsSaleType),
                })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="GENERAL">General</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
              </SelectContent>
            </Select>

            <p className="text-xs font-medium text-muted-foreground">Credit status</p>
            <Select
              value={filters.creditStatus}
              onValueChange={(v) =>
                setFilters({ creditStatus: v as AnalyticsCreditStatus })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="credit">Credit only</SelectItem>
                <SelectItem value="non-credit">Non-credit only</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <>
                <p className="text-xs font-medium text-muted-foreground">User</p>
                <Select
                  value={filters.userId ?? "all"}
                  onValueChange={(v) => setFilters({ userId: v === "all" ? undefined : v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {users.map((u: User) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <p className="text-xs font-medium text-muted-foreground">Category</p>
            <Select
              value={filters.categoryId ?? "all"}
              onValueChange={(v) =>
                setFilters({ categoryId: v === "all" ? undefined : v })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="text-xs font-medium text-muted-foreground">Vendor</p>
            <Select
              value={filters.vendorId ?? "all"}
              onValueChange={(v) =>
                setFilters({ vendorId: v === "all" ? undefined : v })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vendors</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>

      {(filters.locationIds.length > 0 ||
        filters.saleType ||
        filters.creditStatus !== "all" ||
        filters.userId ||
        filters.categoryId ||
        filters.vendorId) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          onClick={() =>
            setFilters({
              locationIds: [],
              saleType: undefined,
              creditStatus: "all",
              userId: undefined,
              categoryId: undefined,
              vendorId: undefined,
            })
          }
        >
          <X className="h-3.5 w-3.5 mr-2" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
