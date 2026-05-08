"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import type { JSX } from "react";

interface BreadcrumbsContextType {
  crumbs: string[];
  subline?: string;
  right?: ReactNode;
  hidden?: boolean;
  setCrumbs: (
    crumbs: string[],
    options?: { subline?: string; right?: ReactNode; hidden?: boolean },
  ) => void;
}

const BreadcrumbsContext = createContext<BreadcrumbsContextType | undefined>(
  undefined,
);

interface BreadcrumbsProviderProps {
  children: ReactNode;
}

export function BreadcrumbsProvider({
  children,
}: BreadcrumbsProviderProps): JSX.Element {
  const [crumbs, setCrumbs] = useState<string[]>([]);
  const [subline, setSubline] = useState<string | undefined>();
  const [right, setRight] = useState<ReactNode>();
  const [hidden, setHidden] = useState<boolean>(false);

  const handleSetCrumbs = useCallback(
    (
      newCrumbs: string[],
      options?: { subline?: string; right?: ReactNode; hidden?: boolean },
    ) => {
      setCrumbs(newCrumbs);
      setSubline(options?.subline);
      setRight(options?.right);
      setHidden(options?.hidden ?? false);
    },
    [],
  );

  return (
    <BreadcrumbsContext.Provider
      value={{ crumbs, subline, right, hidden, setCrumbs: handleSetCrumbs }}
    >
      {children}
    </BreadcrumbsContext.Provider>
  );
}

export function useBreadcrumbs(): BreadcrumbsContextType {
  const ctx = useContext(BreadcrumbsContext);
  if (!ctx) {
    throw new Error("useBreadcrumbs must be used within BreadcrumbsProvider");
  }
  return ctx;
}

interface UseSetBreadcrumbsOptions {
  subline?: string;
  right?: ReactNode;
}

export function useSetBreadcrumbs(
  crumbs: string[],
  options?: UseSetBreadcrumbsOptions,
): void {
  const { setCrumbs } = useBreadcrumbs();

  useEffect(() => {
    setCrumbs(crumbs, options);
  }, [crumbs, options, setCrumbs]);
}

export function useHideCmsTopbar(): void {
  const { setCrumbs } = useBreadcrumbs();

  useEffect(() => {
    setCrumbs([], { hidden: true });
    return () => {
      setCrumbs([], { hidden: false });
    };
  }, [setCrumbs]);
}
