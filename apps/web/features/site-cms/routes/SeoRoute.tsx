"use client";

import { useState, JSX } from "react";
import { useSetBreadcrumbs } from "../hooks/use-breadcrumbs";
import {
  useRedirects,
  useCreateRedirect,
  useUpdateRedirect,
  useDeleteRedirect,
} from "../hooks/use-redirects";
import type {
  Redirect,
  CreateRedirectData,
} from "../services/redirects.service";
import { Btn, Card, Pill } from "../components/ui";
import {
  Section,
  Field,
  Input,
  TextArea,
  Toggle,
  Select,
} from "../components/ui/form-bits";
import { Plus, Upload, Search, Trash2, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Tab = "redirects" | "meta" | "sitemap" | "social";

export function SeoRoute(): JSX.Element {
  useSetBreadcrumbs(["Site", "SEO & Redirects"]);

  const [tab, setTab] = useState<Tab>("redirects");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateRedirectData>({
    fromPath: "",
    toPath: "",
    statusCode: 301,
    isActive: true,
  });

  const { data: redirects = [], isLoading } = useRedirects();
  const createMutation = useCreateRedirect();
  const updateMutation = useUpdateRedirect();
  const deleteMutation = useDeleteRedirect();

  const filteredRedirects = searchQuery
    ? redirects.filter(
        (r) =>
          r.fromPath.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.toPath.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : redirects;

  const handleOpenDialog = (redirect?: Redirect) => {
    if (redirect) {
      setEditingId(redirect.id);
      setFormData({
        fromPath: redirect.fromPath,
        toPath: redirect.toPath,
        statusCode: redirect.statusCode,
        isActive: redirect.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({
        fromPath: "",
        toPath: "",
        statusCode: 301,
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({
      fromPath: "",
      toPath: "",
      statusCode: 301,
      isActive: true,
    });
  };

  const handleSaveRedirect = async () => {
    if (!formData.fromPath || !formData.toPath) return;

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      handleCloseDialog();
    } catch {
      // Error toast handled by mutation
    }
  };

  const handleDeleteRedirect = async (id: string) => {
    if (confirm("Delete this redirect?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div style={{ padding: "20px 24px 64px", maxWidth: 1280 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: -0.3,
            }}
          >
            SEO & redirects
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--ink-3)", fontSize: 13 }}>
            Meta defaults, sitemap, robots, and URL redirects.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 14,
          borderBottom: "1px solid var(--line)",
        }}
      >
        {[
          ["redirects", "Redirects"],
          ["meta", "Meta defaults"],
          ["sitemap", "Sitemap & robots"],
          ["social", "Social cards"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as Tab)}
            style={{
              padding: "8px 12px",
              marginBottom: -1,
              borderLeft: "none",
              borderRight: "none",
              borderTop: "none",
              borderBottom: `2px solid ${tab === key ? "var(--ink)" : "transparent"}`,
              color: tab === key ? "var(--ink)" : "var(--ink-3)",
              fontSize: 12.5,
              fontWeight: tab === key ? 600 : 450,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Redirects Tab */}
      {tab === "redirects" && (
        <Card style={{ padding: 0 }}>
          {/* Toolbar */}
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--line)",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 28,
                padding: "0 10px",
                borderRadius: 5,
                border: "1px solid var(--line)",
                background: "var(--bg-elev)",
                flex: "0 1 240px",
              }}
            >
              <Search size={12} style={{ color: "var(--ink-4)" }} />
              <input
                placeholder="Search redirects…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 12,
                }}
              />
            </div>
            <div style={{ flex: 1 }} />
            <Btn size="sm" icon={Upload}>
              Import CSV
            </Btn>
            <Btn
              size="sm"
              variant="primary"
              icon={Plus}
              onClick={() => handleOpenDialog()}
            >
              New redirect
            </Btn>
          </div>

          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px 2fr 2fr 80px 32px",
              padding: "8px 14px",
              background: "var(--bg-sunken)",
              fontSize: 10.5,
              color: "var(--ink-4)",
              letterSpacing: 0.4,
              textTransform: "uppercase",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span>Code</span>
            <span>From</span>
            <span>To</span>
            <span style={{ textAlign: "right" }}>30d hits</span>
            <span />
          </div>

          {/* Rows */}
          {isLoading ? (
            <div
              style={{
                padding: "20px 14px",
                textAlign: "center",
                color: "var(--ink-3)",
              }}
            >
              Loading…
            </div>
          ) : filteredRedirects.length === 0 ? (
            <div
              style={{
                padding: "20px 14px",
                textAlign: "center",
                color: "var(--ink-3)",
              }}
            >
              {searchQuery
                ? "No redirects match your search."
                : "No redirects yet."}
            </div>
          ) : (
            filteredRedirects.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 2fr 2fr 80px 32px",
                  padding: "11px 14px",
                  alignItems: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  borderTop: "1px solid var(--line-2)",
                }}
              >
                <span
                  style={{
                    fontSize: 10.5,
                    padding: "1px 6px",
                    borderRadius: 3,
                    width: "fit-content",
                    background:
                      r.statusCode === 301
                        ? "oklch(from var(--success) l c h / 0.12)"
                        : "oklch(from var(--warn) l c h / 0.14)",
                    color:
                      r.statusCode === 301 ? "var(--success)" : "var(--warn)",
                  }}
                >
                  {r.statusCode}
                </span>
                <span>{r.fromPath}</span>
                <span style={{ color: "var(--ink-3)" }}>{r.toPath}</span>
                <span style={{ color: "var(--ink-3)", textAlign: "right" }}>
                  —
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 2,
                  }}
                >
                  <button
                    onClick={() => handleOpenDialog(r)}
                    title="Edit"
                    style={{
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--ink-4)",
                    }}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteRedirect(r.id)}
                    title="Delete"
                    style={{
                      width: 20,
                      height: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--ink-4)",
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </Card>
      )}

      {/* Meta Defaults Tab */}
      {tab === "meta" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 14 }}
        >
          <Card padded style={{ opacity: 0.6, pointerEvents: "none" }}>
            <Section label="Default meta">
              <Field label="Site title format">
                <Input value="—" disabled />
              </Field>
              <Field label="Description">
                <TextArea value="—" disabled />
              </Field>
              <Field label="Default keywords">
                <Input value="—" disabled />
              </Field>
            </Section>
            <div
              style={{ margin: "12px 0", borderTop: "1px solid var(--line)" }}
            />
            <Section label="Indexing">
              <Toggle label="Allow search engines to index this site" />
              <Toggle label="Submit sitemap to Google Search Console" />
              <Toggle label="Generate AI-readable summaries (llms.txt)" />
            </Section>
            <div style={{ marginTop: 12 }}>
              <Pill tone="info">Coming soon</Pill>
            </div>
          </Card>
          <Card padded style={{ opacity: 0.6, pointerEvents: "none" }}>
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                color: "var(--ink-4)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              Search preview
            </div>
            <div
              style={{
                padding: 12,
                background: "var(--bg-elev)",
                border: "1px solid var(--line)",
                borderRadius: 6,
              }}
            >
              <div className="mono" style={{ fontSize: 11, color: "#1a73e8" }}>
                example.com › page
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#1a0dab",
                  marginTop: 3,
                }}
              >
                Page title
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--ink-3)",
                  marginTop: 4,
                  lineHeight: 1.45,
                }}
              >
                Page description will appear here…
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Sitemap & Robots Tab */}
      {tab === "sitemap" && (
        <Card padded>
          <Section label="sitemap.xml">
            <div
              className="mono"
              style={{
                fontSize: 12,
                padding: 12,
                background: "var(--bg-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 5,
                color: "var(--ink-3)",
                overflow: "auto",
                maxHeight: 300,
              }}
            >
              {'<?xml version="1.0" encoding="UTF-8"?>'}
              <br />
              {'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'}
              <br />
              &nbsp;&nbsp;
              {
                "<url><loc>https://example.com/</loc><priority>1.0</priority></url>"
              }
              <br />
              &nbsp;&nbsp;
              {
                "<url><loc>https://example.com/page</loc><priority>0.9</priority></url>"
              }
              <br />
              &nbsp;&nbsp;
              <span style={{ color: "var(--ink-4)" }}>… auto-generated …</span>
              <br />
              {"</urlset>"}
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-4)" }}>
              Auto-generated by the renderer.
            </div>
          </Section>

          <div
            style={{ margin: "12px 0", borderTop: "1px solid var(--line)" }}
          />

          <Section label="robots.txt">
            <div
              className="mono"
              style={{
                fontSize: 12,
                padding: 12,
                background: "var(--bg-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 5,
                color: "var(--ink-3)",
                overflow: "auto",
                maxHeight: 200,
              }}
            >
              User-agent: *<br />
              Allow: /<br />
              Disallow: /admin
              <br />
              Disallow: /preview
              <br />
              <br />
              Sitemap: https://example.com/sitemap.xml
            </div>
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-4)" }}>
              Auto-generated by the renderer.
            </div>
          </Section>
        </Card>
      )}

      {/* Social Cards Tab */}
      {tab === "social" && (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <Card padded style={{ opacity: 0.6, pointerEvents: "none" }}>
            <Section label="Open Graph default">
              <div
                style={{
                  aspectRatio: "1.91 / 1",
                  borderRadius: 6,
                  background:
                    "linear-gradient(135deg, oklch(0.42 0.06 50), oklch(0.18 0.04 30))",
                  marginBottom: 10,
                  position: "relative",
                }}
              >
                <div
                  className="serif"
                  style={{
                    position: "absolute",
                    left: 24,
                    bottom: 20,
                    color: "white",
                    fontSize: 28,
                    fontWeight: 600,
                  }}
                >
                  Your site
                </div>
              </div>
              <Btn size="sm" icon={Upload} disabled>
                Replace OG image
              </Btn>
            </Section>
            <div style={{ marginTop: 12 }}>
              <Pill tone="info">Coming soon</Pill>
            </div>
          </Card>
          <Card padded style={{ opacity: 0.6, pointerEvents: "none" }}>
            <Section label="X / Twitter card">
              <Field label="Card type">
                <Select
                  value="Summary, large image"
                  options={["Summary", "Summary, large image", "App"]}
                  onChange={() => {}}
                />
              </Field>
              <Field label="Handle">
                <Input value="@yourhandle" mono disabled />
              </Field>
            </Section>
            <div style={{ marginTop: 12 }}>
              <Pill tone="info">Coming soon</Pill>
            </div>
          </Card>
        </div>
      )}

      {/* New/Edit Redirect Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit redirect" : "New redirect"}
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="From path">
              <Input
                placeholder="/old-path"
                value={formData.fromPath}
                onChange={(e) =>
                  setFormData({ ...formData, fromPath: e.target.value })
                }
                mono
              />
            </Field>

            <Field label="To path">
              <Input
                placeholder="/new-path"
                value={formData.toPath}
                onChange={(e) =>
                  setFormData({ ...formData, toPath: e.target.value })
                }
                mono
              />
            </Field>

            <Field label="Status code">
              <div style={{ display: "flex", gap: 8 }}>
                {[301, 302].map((code) => (
                  <button
                    key={code}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        statusCode: code as 301 | 302,
                      })
                    }
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 5,
                      border:
                        formData.statusCode === code
                          ? "1px solid var(--ink)"
                          : "1px solid var(--line)",
                      background:
                        formData.statusCode === code
                          ? "var(--bg-sunken)"
                          : "transparent",
                      fontSize: 12,
                      fontWeight: formData.statusCode === code ? 600 : 450,
                      cursor: "pointer",
                    }}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </Field>

            <Toggle
              label="Active"
              checked={formData.isActive ?? true}
              onCheckedChange={(checked: boolean) =>
                setFormData({ ...formData, isActive: checked })
              }
            />
          </div>

          <DialogFooter>
            <Btn variant="ghost" onClick={handleCloseDialog}>
              Cancel
            </Btn>
            <Btn
              variant="primary"
              onClick={handleSaveRedirect}
              disabled={
                !formData.fromPath ||
                !formData.toPath ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingId ? "Update" : "Create"}
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
