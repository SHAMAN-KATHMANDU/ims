"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Warehouse, Store } from "lucide-react";
import { useActiveLocations } from "@/hooks/useLocation";

interface LocationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function LocationSelector({
  value,
  onChange,
  placeholder = "Select location",
  includeAll = true,
  allLabel = "All Locations",
  disabled,
  className,
}: LocationSelectorProps) {
  const { data: locations = [], isLoading } = useActiveLocations();

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || isLoading}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={isLoading ? "Loading..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">
            <span className="flex items-center gap-2">{allLabel}</span>
          </SelectItem>
        )}
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            <span className="flex items-center gap-2">
              {location.type === "WAREHOUSE" ? (
                <Warehouse className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Store className="h-4 w-4 text-muted-foreground" />
              )}
              {location.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Hook for managing location state with persistence
export function useLocationFilter() {
  const { data: locations = [] } = useActiveLocations();

  return {
    locations,
    getLocationName: (id: string) => {
      if (id === "all" || !id) return "All Locations";
      return locations.find((loc) => loc.id === id)?.name || "Unknown";
    },
  };
}
