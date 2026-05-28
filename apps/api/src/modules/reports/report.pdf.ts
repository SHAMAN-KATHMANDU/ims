/**
 * PDF rendering for each workflow.
 * Uses pdfkit to generate clean, simple reports with headers and sections.
 */

import PDFDocument from "pdfkit";
import type {
  SalesReportPayload,
  CrmReportPayload,
  InventoryReportPayload,
} from "./report.types";

const MARGIN = 40;
const PAGE_WIDTH = 8.5 * 72; // 8.5 inches in points
const PAGE_HEIGHT = 11 * 72; // 11 inches in points
const USABLE_WIDTH = PAGE_WIDTH - 2 * MARGIN;

interface PdfContext {
  doc: PDFDocument;
  y: number;
}

function addHeader(
  ctx: PdfContext,
  workflowName: string,
  tenantName: string,
  timestamp: string,
): void {
  const { doc, y } = ctx;

  doc.font("Helvetica-Bold").fontSize(18).text(workflowName, MARGIN, y);
  ctx.y += 25;

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Tenant: ${tenantName}`, MARGIN, ctx.y);
  ctx.y += 15;

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#666666")
    .text(`Generated: ${timestamp}`, MARGIN, ctx.y);
  ctx.y += 20;

  // Divider line
  doc
    .moveTo(MARGIN, ctx.y)
    .lineTo(PAGE_WIDTH - MARGIN, ctx.y)
    .stroke("#cccccc");
  ctx.y += 15;
}

function addSectionTitle(ctx: PdfContext, title: string): void {
  if (ctx.y > PAGE_HEIGHT - MARGIN - 30) {
    ctx.doc.addPage();
    ctx.y = MARGIN;
  }

  ctx.doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#000000")
    .text(title, MARGIN, ctx.y);
  ctx.y += 18;
}

function addKeyValuePair(ctx: PdfContext, key: string, value: string): void {
  if (ctx.y > PAGE_HEIGHT - MARGIN - 15) {
    ctx.doc.addPage();
    ctx.y = MARGIN;
  }

  ctx.doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(key, MARGIN, ctx.y, {
      width: USABLE_WIDTH * 0.4,
    });

  ctx.doc
    .font("Helvetica")
    .fontSize(10)
    .text(value, MARGIN + USABLE_WIDTH * 0.4, ctx.y, {
      width: USABLE_WIDTH * 0.6,
    });

  ctx.y += 18;
}

function addTable(
  ctx: PdfContext,
  headers: string[],
  rows: (string | number)[][],
): void {
  if (ctx.y > PAGE_HEIGHT - MARGIN - 50) {
    ctx.doc.addPage();
    ctx.y = MARGIN;
  }

  const colWidth = USABLE_WIDTH / headers.length;
  const rowHeight = 20;

  // Header row
  ctx.doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff");
  ctx.doc.rect(MARGIN, ctx.y, USABLE_WIDTH, rowHeight).fill("#333333");

  headers.forEach((header, i) => {
    ctx.doc
      .fillColor("#ffffff")
      .text(header, MARGIN + i * colWidth, ctx.y + 4, {
        width: colWidth - 4,
        align: "left",
      });
  });

  ctx.y += rowHeight;

  // Data rows
  ctx.doc.font("Helvetica").fontSize(9).fillColor("#000000");
  rows.slice(0, 10).forEach((row) => {
    if (ctx.y > PAGE_HEIGHT - MARGIN - 20) {
      ctx.doc.addPage();
      ctx.y = MARGIN;
    }

    ctx.doc.rect(MARGIN, ctx.y, USABLE_WIDTH, rowHeight).stroke("#e0e0e0");

    row.forEach((cell, i) => {
      ctx.doc.text(String(cell), MARGIN + i * colWidth, ctx.y + 4, {
        width: colWidth - 4,
        align: "left",
      });
    });

    ctx.y += rowHeight;
  });

  ctx.y += 10;
}

function addBulletList(ctx: PdfContext, items: string[]): void {
  ctx.doc.font("Helvetica").fontSize(10);

  items.slice(0, 10).forEach((item) => {
    if (ctx.y > PAGE_HEIGHT - MARGIN - 15) {
      ctx.doc.addPage();
      ctx.y = MARGIN;
    }

    ctx.doc.text(`• ${item}`, MARGIN + 10, ctx.y, { width: USABLE_WIDTH - 20 });
    ctx.y += 16;
  });

  ctx.y += 10;
}

/**
 * Render a Sales report to PDF.
 */
export async function renderSalesPdf(
  payload: SalesReportPayload,
  tenantName: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "Letter", margin: MARGIN });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const ctx: PdfContext = {
      doc,
      y: MARGIN,
    };

    const timestamp = new Date(payload.asOf || Date.now()).toLocaleString();
    addHeader(ctx, "Sales Report", tenantName, timestamp);

    if (payload.summary) {
      addSectionTitle(ctx, "Summary");
      addKeyValuePair(ctx, "Revenue", payload.summary.revenue);
      addKeyValuePair(ctx, "Units Sold", String(payload.summary.units));
      addKeyValuePair(
        ctx,
        "Transactions",
        String(payload.summary.transactions),
      );
      addKeyValuePair(ctx, "30-Day Daily Avg", payload.summary.dailyAvg30d);
    }

    if (payload.last7Days && payload.last7Days.length > 0) {
      addSectionTitle(ctx, "Last 7 Days");
      const headers = ["Date", "Revenue", "Units", "Transactions"];
      const rows = payload.last7Days.map((day) => [
        day.date,
        day.revenue,
        String(day.units),
        String(day.transactions),
      ]);
      addTable(ctx, headers, rows);
    }

    if (payload.vsLastWeek) {
      addSectionTitle(ctx, "vs. Last Week");
      addKeyValuePair(
        ctx,
        "Revenue",
        `${payload.vsLastWeek.revenue.abs} (${payload.vsLastWeek.revenue.pct})`,
      );
      addKeyValuePair(
        ctx,
        "Units",
        `${payload.vsLastWeek.units.abs} (${payload.vsLastWeek.units.pct})`,
      );
      addKeyValuePair(
        ctx,
        "Transactions",
        `${payload.vsLastWeek.transactions.abs} (${payload.vsLastWeek.transactions.pct})`,
      );
    }

    if (
      payload.topProducts?.byRevenue &&
      payload.topProducts.byRevenue.length > 0
    ) {
      addSectionTitle(ctx, "Top Products by Revenue");
      const headers = ["Product", "IMS Code", "Units", "Revenue"];
      const rows = payload.topProducts.byRevenue
        .slice(0, 10)
        .map((p) => [p.productName, p.imsCode, String(p.units), p.revenue]);
      addTable(ctx, headers, rows);
    }

    if (payload.stockOnTopSellers && payload.stockOnTopSellers.length > 0) {
      addSectionTitle(ctx, "Stock Alert: Top Sellers");
      const headers = ["Product", "Current Qty", "Reorder Level", "Status"];
      const rows = payload.stockOnTopSellers.map((s) => [
        s.productName,
        String(s.qty),
        String(s.reorderLevel),
        s.severity || "info",
      ]);
      addTable(ctx, headers, rows);
    }

    if (payload.recommendations && payload.recommendations.length > 0) {
      addSectionTitle(ctx, "AI Recommendations");
      addBulletList(ctx, payload.recommendations);
    }

    doc.end();
  });
}

/**
 * Render a CRM report to PDF.
 */
export async function renderCrmPdf(
  payload: CrmReportPayload,
  tenantName: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "Letter", margin: MARGIN });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const ctx: PdfContext = {
      doc,
      y: MARGIN,
    };

    const timestamp = new Date(payload.since || Date.now()).toLocaleString();
    addHeader(ctx, "CRM Report", tenantName, timestamp);

    if (payload.staffActivity && payload.staffActivity.length > 0) {
      addSectionTitle(ctx, "Staff Activity");
      const headers = ["Username", "Total Activities", "Today", "Yesterday"];
      const rows = payload.staffActivity.map((s) => [
        s.username,
        String(s.totalActivities),
        String(s.todayCount || 0),
        String(s.yesterdayCount || 0),
      ]);
      addTable(ctx, headers, rows);
    }

    if (payload.byStage && payload.byStage.length > 0) {
      addSectionTitle(ctx, "Opportunities by Stage");
      const headers = ["Stage", "Count", "Total Value"];
      const rows = payload.byStage.map((s) => [
        s.stage,
        String(s.count),
        s.totalValue,
      ]);
      addTable(ctx, headers, rows);
    }

    if (payload.stalled && payload.stalled.length > 0) {
      addSectionTitle(ctx, "Stalled Deals");
      const headers = ["Deal Name", "Stage", "Value", "Days Since Update"];
      const rows = payload.stalled.map((s) => [
        s.name,
        s.stage,
        s.value,
        String(s.daysSinceUpdate),
      ]);
      addTable(ctx, headers, rows);
    }

    if (payload.overdueTasks && payload.overdueTasks.length > 0) {
      addSectionTitle(ctx, "Overdue Tasks");
      const headers = ["Task", "Due Date", "Days Overdue", "Assigned To"];
      const rows = payload.overdueTasks.map((t) => [
        t.title,
        t.dueDate,
        String(t.daysOverdue),
        t.assignedTo,
      ]);
      addTable(ctx, headers, rows);
    }

    if (payload.conversion && payload.conversion.length > 0) {
      addSectionTitle(ctx, "Conversion Metrics");
      const headers = [
        "Username",
        "Activities",
        "Deals Won",
        "Win Value",
        "Rate",
      ];
      const rows = payload.conversion.map((c) => [
        c.username,
        String(c.activitiesCount),
        String(c.dealsWonCount),
        c.dealsWonValue,
        c.conversionRate,
      ]);
      addTable(ctx, headers, rows);
    }

    if (payload.flags && payload.flags.length > 0) {
      addSectionTitle(ctx, "AI Callouts");
      addBulletList(ctx, payload.flags);
    }

    doc.end();
  });
}

/**
 * Render an Inventory report to PDF.
 */
export async function renderInventoryPdf(
  payload: InventoryReportPayload,
  tenantName: string,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "Letter", margin: MARGIN });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const ctx: PdfContext = {
      doc,
      y: MARGIN,
    };

    const timestamp = new Date(payload.asOf || Date.now()).toLocaleString();
    addHeader(ctx, "Inventory Report", tenantName, timestamp);

    if (payload.snapshot) {
      addSectionTitle(ctx, "Snapshot");
      addKeyValuePair(ctx, "Total SKUs", String(payload.snapshot.totalSkus));
      addKeyValuePair(
        ctx,
        "Below Reorder",
        String(payload.snapshot.belowReorder),
      );
      addKeyValuePair(ctx, "Overstocked", String(payload.snapshot.overstocked));
    }

    if (payload.reorderNow && payload.reorderNow.length > 0) {
      addSectionTitle(ctx, "Reorder Immediately");
      const headers = [
        "Product",
        "IMS Code",
        "Current Qty",
        "Reorder Level",
        "Severity",
      ];
      const rows = payload.reorderNow.map((r) => [
        r.productName,
        r.imsCode,
        String(r.qty),
        String(r.reorderLevel),
        r.severity || "critical",
      ]);
      addTable(ctx, headers, rows);
    }

    if (payload.pushOrPromote && payload.pushOrPromote.length > 0) {
      addSectionTitle(ctx, "Push or Promote");
      const headers = ["Product", "Current Qty", "Reasoning"];
      const rows = payload.pushOrPromote.map((p) => [
        p.productName,
        String(p.qty),
        p.reasoning || "—",
      ]);
      addTable(ctx, headers, rows);
    }

    if (payload.reviewAndDecide && payload.reviewAndDecide.length > 0) {
      addSectionTitle(ctx, "Review & Decide");
      const headers = ["Product", "Current Qty", "Last Sale", "Reasoning"];
      const rows = payload.reviewAndDecide.map((r) => [
        r.productName,
        String(r.qty),
        r.lastSaleDate || "—",
        r.reasoning || "—",
      ]);
      addTable(ctx, headers, rows);
    }

    doc.end();
  });
}
