import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCrmDashboard,
  getCrmReports,
  exportCrmReports,
  type CrmDashboardData,
  type CrmReportsData,
} from "./crm.service";

const mockGet = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

describe("crm.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: getCrmDashboard fetches data and unwraps response correctly
  it("fetches CRM dashboard without params and unwraps data", async () => {
    const mockData: CrmDashboardData = {
      totalDealsValue: 150000,
      dealsClosingThisMonth: 5,
      tasksDueToday: 12,
      leadConversionRate: 0.25,
      totalLeads: 100,
      convertedLeads: 25,
      monthlyRevenueChart: [
        { month: "Jan", revenue: 10000 },
        { month: "Feb", revenue: 15000 },
      ],
      pipelineFunnels: [
        {
          pipelineId: "p1",
          pipelineName: "New Sales",
          pipelineType: "NEW_SALES",
          stages: [
            { stageId: "s1", stage: "Lead", count: 50, value: 50000 },
            { stageId: "s2", stage: "Qualified", count: 20, value: 60000 },
          ],
        },
      ],
      activitySummary: [
        {
          id: "a1",
          type: "call",
          subject: "Initial contact",
          activityAt: "2026-06-19T10:00:00Z",
          contact: {
            id: "c1",
            firstName: "John",
            lastName: "Doe",
          },
          deal: {
            id: "d1",
            name: "Deal A",
          },
          creator: {
            id: "u1",
            username: "john",
          },
        },
      ],
    };

    mockGet.mockResolvedValue({ data: { data: mockData } });
    const result = await getCrmDashboard();

    expect(mockGet).toHaveBeenCalledWith("/crm/dashboard");
    expect(result).toEqual({ data: mockData });
    expect(result.data.totalDealsValue).toBe(150000);
    expect(result.data.pipelineFunnels).toHaveLength(1);
    expect(result.data.activitySummary).toHaveLength(1);
  });

  // Test 2: getCrmReports with year param includes year in params
  it("fetches CRM reports with year parameter", async () => {
    const mockData: CrmReportsData = {
      year: 2026,
      dealsWon: 15,
      dealsLost: 3,
      totalRevenue: 250000,
      conversionRate: 0.8,
      salesPerUser: [
        {
          userId: "u1",
          username: "john",
          dealCount: 5,
          totalValue: 100000,
        },
        {
          userId: "u2",
          username: "jane",
          dealCount: 10,
          totalValue: 150000,
        },
      ],
      staffPerformance: [
        {
          userId: "u1",
          username: "john",
          calls: 45,
          emails: 32,
          meetings: 8,
          dealCount: 5,
          totalValue: 100000,
        },
      ],
      leadsBySource: [
        { source: "website", count: 40 },
        { source: "referral", count: 30 },
      ],
      monthlyRevenue: [
        { month: "Jan", revenue: 20000 },
        { month: "Feb", revenue: 25000 },
      ],
    };

    mockGet.mockResolvedValue({ data: { data: mockData } });
    const result = await getCrmReports(2026);

    expect(mockGet).toHaveBeenCalledWith("/crm/reports", {
      params: { year: 2026 },
    });
    expect(result).toEqual({ data: mockData });
    expect(result.data.year).toBe(2026);
    expect(result.data.salesPerUser).toHaveLength(2);
    expect(result.data.staffPerformance).toHaveLength(1);
  });

  // Test 3: getCrmReports without year param sends empty params object
  it("fetches CRM reports without year parameter", async () => {
    const mockData: CrmReportsData = {
      year: 2026,
      dealsWon: 20,
      dealsLost: 5,
      totalRevenue: 500000,
      conversionRate: 0.85,
      salesPerUser: [
        {
          userId: "u1",
          username: "alice",
          dealCount: 8,
          totalValue: 200000,
        },
      ],
      staffPerformance: [
        {
          userId: "u1",
          username: "alice",
          calls: 60,
          emails: 50,
          meetings: 12,
          dealCount: 8,
          totalValue: 200000,
        },
      ],
      leadsBySource: [{ source: "inbound", count: 100 }],
      monthlyRevenue: [{ month: "Jan", revenue: 50000 }],
    };

    mockGet.mockResolvedValue({ data: { data: mockData } });
    const result = await getCrmReports();

    expect(mockGet).toHaveBeenCalledWith("/crm/reports", {
      params: {},
    });
    expect(result.data.dealsWon).toBe(20);
  });

  // Test 4: exportCrmReports with year param and blob responseType
  it("exports CRM reports as blob with year parameter", async () => {
    const mockBlob = new Blob(["mock,csv,data"], { type: "text/csv" });
    mockGet.mockResolvedValue({ data: mockBlob });

    const result = await exportCrmReports(2026);

    expect(mockGet).toHaveBeenCalledWith("/crm/reports/export", {
      params: { year: 2026 },
      responseType: "blob",
    });
    expect(result).toEqual(mockBlob);
    expect(result.type).toBe("text/csv");
  });

  // Test 5: exportCrmReports without year param still sets blob responseType
  it("exports CRM reports as blob without year parameter", async () => {
    const mockBlob = new Blob(["report,data"], { type: "text/csv" });
    mockGet.mockResolvedValue({ data: mockBlob });

    const result = await exportCrmReports();

    expect(mockGet).toHaveBeenCalledWith("/crm/reports/export", {
      params: {},
      responseType: "blob",
    });
    expect(result).toEqual(mockBlob);
  });

  // Test 6: getCrmDashboard handles empty activity summary
  it("handles empty activity summary in dashboard data", async () => {
    const mockData: CrmDashboardData = {
      totalDealsValue: 0,
      dealsClosingThisMonth: 0,
      tasksDueToday: 0,
      leadConversionRate: 0,
      totalLeads: 0,
      convertedLeads: 0,
      monthlyRevenueChart: [],
      pipelineFunnels: [],
      activitySummary: [],
    };

    mockGet.mockResolvedValue({ data: { data: mockData } });
    const result = await getCrmDashboard();

    expect(result.data.activitySummary).toEqual([]);
    expect(result.data.pipelineFunnels).toEqual([]);
  });

  // Test 7: getCrmReports handles null/missing nested fields
  it("handles activity with null contact and deal fields", async () => {
    const mockData: CrmDashboardData = {
      totalDealsValue: 100000,
      dealsClosingThisMonth: 2,
      tasksDueToday: 5,
      leadConversionRate: 0.2,
      totalLeads: 50,
      convertedLeads: 10,
      monthlyRevenueChart: [{ month: "Mar", revenue: 25000 }],
      pipelineFunnels: [
        {
          pipelineId: "p2",
          pipelineName: "Remarketing",
          pipelineType: "REMARKETING",
          stages: [
            { stageId: null, stage: "Contacted", count: 15, value: 30000 },
          ],
        },
      ],
      activitySummary: [
        {
          id: "a2",
          type: "email",
          subject: null,
          activityAt: "2026-06-19T14:00:00Z",
          contact: null,
          deal: null,
          creator: {
            id: "u2",
            username: "system",
          },
        },
      ],
    };

    mockGet.mockResolvedValue({ data: { data: mockData } });
    const result = await getCrmDashboard();

    expect(result.data.activitySummary[0]!.contact).toBeNull();
    expect(result.data.activitySummary[0]!.deal).toBeNull();
    expect(result.data.activitySummary[0]!.subject).toBeNull();
    expect(result.data.pipelineFunnels[0]!.stages[0]!.stageId).toBeNull();
  });

  // Test 8: getCrmReports with zero values
  it("handles CRM reports with zero values", async () => {
    const mockData: CrmReportsData = {
      year: 2025,
      dealsWon: 0,
      dealsLost: 0,
      totalRevenue: 0,
      conversionRate: 0,
      salesPerUser: [],
      staffPerformance: [],
      leadsBySource: [],
      monthlyRevenue: [],
    };

    mockGet.mockResolvedValue({ data: { data: mockData } });
    const result = await getCrmReports(2025);

    expect(result.data.dealsWon).toBe(0);
    expect(result.data.totalRevenue).toBe(0);
    expect(result.data.salesPerUser).toEqual([]);
    expect(result.data.staffPerformance).toEqual([]);
  });
});
