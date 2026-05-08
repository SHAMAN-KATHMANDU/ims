import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DomainsRoute } from "./DomainsRoute";

vi.mock("../hooks/use-breadcrumbs", () => ({
  useSetBreadcrumbs: vi.fn(),
}));

vi.mock("@/features/sites", () => ({
  useMyDomains: vi.fn(),
  useMyDomainVerificationInstructions: vi.fn(),
  useVerifyMyDomain: vi.fn(),
}));

vi.mock("../../sites/components/AddDomainDialog", () => ({
  AddDomainDialog: ({ open }: { open: boolean }) =>
    open ? <div>Mock Add Domain Dialog</div> : null,
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import * as sitesModule from "@/features/sites";
import type {
  TenantDomain,
  DomainVerificationInstructions,
} from "@/features/sites";

describe("DomainsRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockUseMyDomains = vi.mocked(sitesModule.useMyDomains);
    const mockUseVerify = vi.mocked(
      sitesModule.useMyDomainVerificationInstructions,
    );
    const mockUseVerifyMutation = vi.mocked(sitesModule.useVerifyMyDomain);

    mockUseMyDomains.mockReturnValue({
      data: [],
      isLoading: false,
    } as never);

    mockUseVerify.mockReturnValue({
      data: null,
    } as never);

    mockUseVerifyMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
  });

  it("renders the domains page", () => {
    const { container } = render(<DomainsRoute />);
    // Breadcrumbs and main layout should be present
    expect(container.innerHTML).toContain("No domains connected yet");
  });

  it("displays empty state when no domains", () => {
    render(<DomainsRoute />);
    expect(screen.getByText(/No domains connected yet/i)).toBeDefined();
  });

  it("renders loading state", () => {
    const mockUseMyDomains = vi.mocked(sitesModule.useMyDomains);
    mockUseMyDomains.mockReturnValue({
      data: [],
      isLoading: true,
    } as never);
    render(<DomainsRoute />);
    expect(screen.getByText(/Loading domains/i)).toBeDefined();
  });

  it("renders domain list when domains exist", () => {
    const mockDomains: TenantDomain[] = [
      {
        id: "d1",
        hostname: "example.com",
        appType: "WEBSITE",
        isPrimary: true,
        verifiedAt: "2026-05-01T00:00:00Z",
        tlsStatus: "ACTIVE",
        tlsLastError: null,
        verifyToken: "token",
        createdAt: "2026-05-01T00:00:00Z",
        updatedAt: "2026-05-01T00:00:00Z",
        tenantId: "t1",
      },
    ];

    const mockVerify: DomainVerificationInstructions = {
      hostname: "example.com",
      aRecordName: "@",
      aRecordValue: "1.2.3.4",
      txtName: "_verification",
      txtValue: "token123",
      verifiedAt: "2026-05-01T00:00:00Z",
    };

    const mockUseMyDomains = vi.mocked(sitesModule.useMyDomains);
    const mockUseVerify = vi.mocked(
      sitesModule.useMyDomainVerificationInstructions,
    );

    mockUseMyDomains.mockReturnValue({
      data: mockDomains,
      isLoading: false,
    } as never);

    mockUseVerify.mockReturnValue({
      data: mockVerify,
    } as never);

    const { container } = render(<DomainsRoute />);
    expect(container.innerHTML).toContain("example.com");
  });
});
