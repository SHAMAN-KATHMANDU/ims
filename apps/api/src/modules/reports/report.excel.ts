/**
 * Excel rendering for each workflow.
 * Uses exceljs to generate multi-sheet workbooks.
 * Mirrors the style from crm.service.ts > exportReportsExcel.
 */

import ExcelJS from "exceljs";
import type {
  SalesReportPayload,
  CrmReportPayload,
  InventoryReportPayload,
} from "./report.types";

const HEADER_FILL = "4472C4";
const HEADER_FONT_COLOR = "FFFFFF";

function createWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  return workbook;
}

function styleHeaderRow(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: HEADER_FONT_COLOR } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: HEADER_FILL },
  };
  row.alignment = { horizontal: "left", vertical: "middle" };
}

/**
 * Render a Sales report to Excel.
 */
export async function renderSalesExcel(
  payload: SalesReportPayload,
  tenantName: string,
): Promise<Buffer> {
  const workbook = createWorkbook();

  // Summary sheet
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 25 },
    { header: "Value", key: "value", width: 30 },
  ];
  styleHeaderRow(summarySheet.getRow(1));

  if (payload.summary) {
    summarySheet.addRow({
      metric: "Report Date",
      value: payload.asOf || new Date().toISOString(),
    });
    summarySheet.addRow({
      metric: "Revenue",
      value: payload.summary.revenue,
    });
    summarySheet.addRow({
      metric: "Units Sold",
      value: payload.summary.units,
    });
    summarySheet.addRow({
      metric: "Transactions",
      value: payload.summary.transactions,
    });
    summarySheet.addRow({
      metric: "30-Day Daily Avg",
      value: payload.summary.dailyAvg30d,
    });
  }

  // Last 7 Days sheet
  if (payload.last7Days && payload.last7Days.length > 0) {
    const sheet = workbook.addWorksheet("Last 7 Days");
    sheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Revenue", key: "revenue", width: 15 },
      { header: "Units", key: "units", width: 12 },
      { header: "Transactions", key: "transactions", width: 15 },
    ];
    styleHeaderRow(sheet.getRow(1));

    payload.last7Days.forEach((day) => {
      sheet.addRow({
        date: day.date,
        revenue: day.revenue,
        units: day.units,
        transactions: day.transactions,
      });
    });
  }

  // Top Products by Revenue sheet
  if (
    payload.topProducts?.byRevenue &&
    payload.topProducts.byRevenue.length > 0
  ) {
    const sheet = workbook.addWorksheet("Top Products (Revenue)");
    sheet.columns = [
      { header: "Product", key: "productName", width: 25 },
      { header: "IMS Code", key: "imsCode", width: 15 },
      { header: "Units", key: "units", width: 12 },
      { header: "Revenue", key: "revenue", width: 15 },
      { header: "% of Total", key: "pct", width: 12 },
    ];
    styleHeaderRow(sheet.getRow(1));

    payload.topProducts.byRevenue.forEach((p) => {
      sheet.addRow({
        productName: p.productName,
        imsCode: p.imsCode,
        units: p.units,
        revenue: p.revenue,
        pct: p.pct,
      });
    });
  }

  // Stock Alerts sheet
  if (payload.stockOnTopSellers && payload.stockOnTopSellers.length > 0) {
    const sheet = workbook.addWorksheet("Stock Alerts");
    sheet.columns = [
      { header: "Product", key: "productName", width: 25 },
      { header: "Current Qty", key: "qty", width: 15 },
      { header: "Reorder Level", key: "reorderLevel", width: 15 },
      { header: "Severity", key: "severity", width: 12 },
    ];
    styleHeaderRow(sheet.getRow(1));

    payload.stockOnTopSellers.forEach((s) => {
      sheet.addRow({
        productName: s.productName,
        qty: s.qty,
        reorderLevel: s.reorderLevel,
        severity: s.severity || "info",
      });
    });
  }

  // Recommendations sheet
  if (payload.recommendations && payload.recommendations.length > 0) {
    const sheet = workbook.addWorksheet("Recommendations");
    sheet.columns = [{ header: "Recommendation", key: "text", width: 60 }];
    styleHeaderRow(sheet.getRow(1));

    payload.recommendations.forEach((rec) => {
      sheet.addRow({ text: rec });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

/**
 * Render a CRM report to Excel.
 */
export async function renderCrmExcel(
  payload: CrmReportPayload,
  tenantName: string,
): Promise<Buffer> {
  const workbook = createWorkbook();

  // Summary sheet
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 25 },
    { header: "Value", key: "value", width: 30 },
  ];
  styleHeaderRow(summarySheet.getRow(1));

  summarySheet.addRow({
    metric: "Report Period Start",
    value: payload.since || new Date().toISOString(),
  });

  // Staff Activity sheet
  if (payload.staffActivity && payload.staffActivity.length > 0) {
    const sheet = workbook.addWorksheet("Staff Activity");
    sheet.columns = [
      { header: "Username", key: "username", width: 20 },
      { header: "Total Activities", key: "totalActivities", width: 18 },
      { header: "Today", key: "todayCount", width: 12 },
      { header: "Yesterday", key: "yesterdayCount", width: 15 },
    ];
    styleHeaderRow(sheet.getRow(1));

    payload.staffActivity.forEach((s) => {
      sheet.addRow({
        username: s.username,
        totalActivities: s.totalActivities,
        todayCount: s.todayCount || 0,
        yesterdayCount: s.yesterdayCount || 0,
      });
    });
  }

  // Opportunities by Stage sheet
  if (payload.byStage && payload.byStage.length > 0) {
    const sheet = workbook.addWorksheet("Opportunities");
    sheet.columns = [
      { header: "Stage", key: "stage", width: 20 },
      { header: "Count", key: "count", width: 12 },
      { header: "Total Value", key: "totalValue", width: 15 },
    ];
    styleHeaderRow(sheet.getRow(1));

    payload.byStage.forEach((s) => {
      sheet.addRow({
        stage: s.stage,
        count: s.count,
        totalValue: s.totalValue,
      });
    });
  }

  // Stalled Deals sheet
  if (payload.stalled && payload.stalled.length > 0) {
    const sheet = workbook.addWorksheet("Stalled");
    sheet.columns = [
      { header: "Deal Name", key: "name", width: 25 },
      { header: "Stage", key: "stage", width: 15 },
      { header: "Value", key: "value", width: 15 },
      { header: "Days Since Update", key: "daysSinceUpdate", width: 18 },
      { header: "Assigned To", key: "assignedTo", width: 20 },
    ];
    styleHeaderRow(sheet.getRow(1));

    payload.stalled.forEach((s) => {
      sheet.addRow({
        name: s.name,
        stage: s.stage,
        value: s.value,
        daysSinceUpdate: s.daysSinceUpdate,
        assignedTo: s.assignedTo || "—",
      });
    });
  }

  // Overdue Tasks sheet
  if (payload.overdueTasks && payload.overdueTasks.length > 0) {
    const sheet = workbook.addWorksheet("Overdue Tasks");
    sheet.columns = [
      { header: "Task", key: "title", width: 30 },
      { header: "Due Date", key: "dueDate", width: 15 },
      { header: "Days Overdue", key: "daysOverdue", width: 15 },
      { header: "Assigned To", key: "assignedTo", width: 20 },
    ];
    styleHeaderRow(sheet.getRow(1));

    payload.overdueTasks.forEach((t) => {
      sheet.addRow({
        title: t.title,
        dueDate: t.dueDate,
        daysOverdue: t.daysOverdue,
        assignedTo: t.assignedTo,
      });
    });
  }

  // Conversion Metrics sheet
  if (payload.conversion && payload.conversion.length > 0) {
    const sheet = workbook.addWorksheet("Conversion");
    sheet.columns = [
      { header: "Username", key: "username", width: 20 },
      { header: "Activities", key: "activitiesCount", width: 15 },
      { header: "Deals Won", key: "dealsWonCount", width: 15 },
      { header: "Win Value", key: "dealsWonValue", width: 15 },
      { header: "Conversion Rate", key: "conversionRate", width: 18 },
    ];
    styleHeaderRow(sheet.getRow(1));

    payload.conversion.forEach((c) => {
      sheet.addRow({
        username: c.username,
        activitiesCount: c.activitiesCount,
        dealsWonCount: c.dealsWonCount,
        dealsWonValue: c.dealsWonValue,
        conversionRate: c.conversionRate,
      });
    });
  }

  // AI Callouts sheet
  if (payload.flags && payload.flags.length > 0) {
    const sheet = workbook.addWorksheet("AI Callouts");
    sheet.columns = [{ header: "Callout", key: "text", width: 60 }];
    styleHeaderRow(sheet.getRow(1));

    payload.flags.forEach((flag) => {
      sheet.addRow({ text: flag });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

/**
 * Render an Inventory report to Excel.
 */
export async function renderInventoryExcel(
  payload: InventoryReportPayload,
  tenantName: string,
): Promise<Buffer> {
  const workbook = createWorkbook();

  // Summary sheet
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 25 },
    { header: "Value", key: "value", width: 30 },
  ];
  styleHeaderRow(summarySheet.getRow(1));

  summarySheet.addRow({
    metric: "Report Date",
    value: payload.asOf || new Date().toISOString(),
  });

  if (payload.snapshot) {
    summarySheet.addRow({
      metric: "Total SKUs",
      value: payload.snapshot.totalSkus,
    });
    summarySheet.addRow({
      metric: "Below Reorder",
      value: payload.snapshot.belowReorder,
    });
    summarySheet.addRow({
      metric: "Overstocked",
      value: payload.snapshot.overstocked,
    });
  }

  // Reorder Immediately sheet
  if (payload.reorderNow && payload.reorderNow.length > 0) {
    const sheet = workbook.addWorksheet("Reorder Now");
    sheet.columns = [
      { header: "Product", key: "productName", width: 25 },
      { header: "IMS Code", key: "imsCode", width: 15 },
      { header: "Current Qty", key: "qty", width: 15 },
      { header: "Reorder Level", key: "reorderLevel", width: 15 },
      { header: "Severity", key: "severity", width: 12 },
    ];
    styleHeaderRow(sheet.getRow(1));

    payload.reorderNow.forEach((r) => {
      sheet.addRow({
        productName: r.productName,
        imsCode: r.imsCode,
        qty: r.qty,
        reorderLevel: r.reorderLevel,
        severity: r.severity || "critical",
      });
    });
  }

  // Push or Promote sheet
  if (payload.pushOrPromote && payload.pushOrPromote.length > 0) {
    const sheet = workbook.addWorksheet("Push/Promote");
    sheet.columns = [
      { header: "Product", key: "productName", width: 25 },
      { header: "Current Qty", key: "qty", width: 15 },
      { header: "Reasoning", key: "reasoning", width: 40 },
    ];
    styleHeaderRow(sheet.getRow(1));

    payload.pushOrPromote.forEach((p) => {
      sheet.addRow({
        productName: p.productName,
        qty: p.qty,
        reasoning: p.reasoning || "—",
      });
    });
  }

  // Review & Decide sheet
  if (payload.reviewAndDecide && payload.reviewAndDecide.length > 0) {
    const sheet = workbook.addWorksheet("Review/Decide");
    sheet.columns = [
      { header: "Product", key: "productName", width: 25 },
      { header: "Current Qty", key: "qty", width: 15 },
      { header: "Last Sale Date", key: "lastSaleDate", width: 15 },
      { header: "Reasoning", key: "reasoning", width: 40 },
    ];
    styleHeaderRow(sheet.getRow(1));

    payload.reviewAndDecide.forEach((r) => {
      sheet.addRow({
        productName: r.productName,
        qty: r.qty,
        lastSaleDate: r.lastSaleDate || "—",
        reasoning: r.reasoning || "—",
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
