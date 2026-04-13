import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSiteConfig,
  updateSiteConfig,
  listSiteTemplates,
  pickSiteTemplate,
  publishSite,
  unpublishSite,
} from "./tenant-site.service";

const mockGet = vi.fn();
const mockPut = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/axios", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

vi.mock("@/lib/api-error", () => ({
  handleApiError: vi.fn((err: unknown) => {
    throw err;
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tenant-site.service", () => {
  it("getSiteConfig calls GET /sites/config", async () => {
    mockGet.mockResolvedValue({
      data: { siteConfig: { id: "sc1", websiteEnabled: true } },
    });

    const result = await getSiteConfig();

    expect(mockGet).toHaveBeenCalledWith("/sites/config");
    expect(result.id).toBe("sc1");
  });

  it("updateSiteConfig calls PUT /sites/config with partial payload", async () => {
    mockPut.mockResolvedValue({ data: { siteConfig: { id: "sc1" } } });

    await updateSiteConfig({ branding: { name: "Acme" } });

    expect(mockPut).toHaveBeenCalledWith("/sites/config", {
      branding: { name: "Acme" },
    });
  });

  it("listSiteTemplates calls GET /sites/templates", async () => {
    mockGet.mockResolvedValue({
      data: { templates: [{ slug: "minimal" }, { slug: "luxury" }] },
    });

    const result = await listSiteTemplates();

    expect(mockGet).toHaveBeenCalledWith("/sites/templates");
    expect(result).toHaveLength(2);
  });

  it("listSiteTemplates returns [] when response has no templates key", async () => {
    mockGet.mockResolvedValue({ data: {} });
    const result = await listSiteTemplates();
    expect(result).toEqual([]);
  });

  it("pickSiteTemplate calls POST /sites/template with slug and resetBranding", async () => {
    mockPost.mockResolvedValue({ data: { siteConfig: { id: "sc1" } } });

    await pickSiteTemplate("luxury", true);

    expect(mockPost).toHaveBeenCalledWith("/sites/template", {
      templateSlug: "luxury",
      resetBranding: true,
    });
  });

  it("pickSiteTemplate throws on empty slug without hitting the API", async () => {
    await expect(pickSiteTemplate("", false)).rejects.toThrow(/Template slug/);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("publishSite calls POST /sites/publish with empty body", async () => {
    mockPost.mockResolvedValue({
      data: { siteConfig: { id: "sc1", isPublished: true } },
    });

    const result = await publishSite();

    expect(mockPost).toHaveBeenCalledWith("/sites/publish", {});
    expect(result.isPublished).toBe(true);
  });

  it("unpublishSite calls POST /sites/unpublish with empty body", async () => {
    mockPost.mockResolvedValue({
      data: { siteConfig: { id: "sc1", isPublished: false } },
    });

    const result = await unpublishSite();

    expect(mockPost).toHaveBeenCalledWith("/sites/unpublish", {});
    expect(result.isPublished).toBe(false);
  });
});
