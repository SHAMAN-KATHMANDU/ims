/**
 * Product bulk download controller — template and export (Excel/CSV).
 */
import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { fail } from "@/shared/response";
import { getProductsForExport } from "./products.service";

export async function downloadBulkUploadTemplate(
  _req: Request,
  res: Response,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Products Template");

  const headers = [
    { header: "IMS Code", width: 15 },
    { header: "Location", width: 22 },
    { header: "Category", width: 18 },
    { header: "Sub-Category", width: 15 },
    { header: "Name of Product", width: 28 },
    { header: "Variations (Designs/Colors)", width: 28 },
    { header: "Material", width: 15 },
    { header: "Length", width: 10 },
    { header: "Breadth", width: 10 },
    { header: "Height", width: 10 },
    { header: "Weight", width: 10 },
    { header: "Vendor", width: 15 },
    { header: "Qty", width: 8 },
    { header: "Cost Price", width: 12 },
    { header: "Final SP", width: 12 },
    { header: "Non Member Discount", width: 20 },
    { header: "Member Discount", width: 18 },
    { header: "Wholesale Discount", width: 20 },
  ];
  const requiredOptional = [
    "Required",
    "Required",
    "Required",
    "Optional",
    "Required",
    "Required",
    "Optional",
    "Optional",
    "Optional",
    "Optional",
    "Optional",
    "Optional",
    "Optional",
    "Required",
    "Required",
    "Optional",
    "Optional",
    "Optional",
  ];

  worksheet.columns = headers.map((h) => ({
    header: h.header,
    width: h.width,
  }));
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };
  const row2 = worksheet.getRow(2);
  requiredOptional.forEach((text, i) => {
    row2.getCell(i + 1).value = text;
  });
  row2.font = { italic: true };

  const filename = "products_bulk_upload_template.xlsx";
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  const buffer = await workbook.xlsx.writeBuffer();
  res.send(buffer);
}

export async function downloadProducts(
  req: Request,
  res: Response,
): Promise<void> {
  const auth = req.authContext!;
  const query = getValidatedQuery<{
    format?: "excel" | "csv";
    ids?: string;
  }>(req, res);
  const { format = "excel", ids: idsParam } = query;

  if (format !== "excel" && format !== "csv") {
    fail(res, "Invalid format. Supported formats: excel, csv", 400);
    return;
  }

  let productIds: string[] | undefined;
  if (idsParam) {
    productIds = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  const products = await getProductsForExport(auth.tenantId, productIds);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Products");

  const columns = [
    { header: "IMS Code", key: "imsCode", width: 15 },
    { header: "Product Name", key: "name", width: 30 },
    { header: "Category", key: "category", width: 20 },
    { header: "Description", key: "description", width: 40 },
    { header: "Cost Price", key: "costPrice", width: 15 },
    { header: "MRP", key: "mrp", width: 15 },
    { header: "Length (cm)", key: "length", width: 15 },
    { header: "Breadth (cm)", key: "breadth", width: 15 },
    { header: "Height (cm)", key: "height", width: 15 },
    { header: "Weight (kg)", key: "weight", width: 15 },
    { header: "Total Stock", key: "totalStock", width: 15 },
    { header: "Variations", key: "variations", width: 40 },
    { header: "Discounts", key: "discounts", width: 40 },
  ];

  worksheet.columns = columns;
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  products.forEach((product) => {
    const totalStock = product.variations.reduce(
      (sum, v) => sum + (v.stockQuantity || 0),
      0,
    );
    const variationsStr =
      product.variations.length > 0
        ? product.variations
            .map((v) => `${v.color} (${v.stockQuantity})`)
            .join("; ")
        : "No variations";
    const discountsStr =
      product.discounts && product.discounts.length > 0
        ? product.discounts
            .filter((d) => d.isActive)
            .map(
              (d) =>
                `${d.discountType?.name || "Unknown"}: ${d.discountPercentage}%`,
            )
            .join("; ")
        : "No discounts";

    worksheet.addRow({
      imsCode: product.imsCode,
      name: product.name,
      category: product.category?.name || "N/A",
      description: product.description || "N/A",
      costPrice: product.costPrice,
      mrp: product.mrp,
      length: product.length || "N/A",
      breadth: product.breadth || "N/A",
      height: product.height || "N/A",
      weight: product.weight || "N/A",
      totalStock,
      variations: variationsStr,
      discounts: discountsStr,
    });
  });

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `products_${timestamp}.${format === "excel" ? "xlsx" : "csv"}`;

  if (format === "excel") {
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } else {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const escapeCsvValue = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows: string[] = [];
    csvRows.push(columns.map((col) => escapeCsvValue(col.header)).join(","));
    products.forEach((product) => {
      const totalStock = product.variations.reduce(
        (sum, v) => sum + (v.stockQuantity || 0),
        0,
      );
      const variationsStr =
        product.variations.length > 0
          ? product.variations
              .map((v) => `${v.color} (${v.stockQuantity})`)
              .join("; ")
          : "No variations";
      const discountsStr =
        product.discounts && product.discounts.length > 0
          ? product.discounts
              .filter((d) => d.isActive)
              .map(
                (d) =>
                  `${d.discountType?.name || "Unknown"}: ${d.discountPercentage}%`,
              )
              .join("; ")
          : "No discounts";

      const row = [
        escapeCsvValue(product.imsCode),
        escapeCsvValue(product.name),
        escapeCsvValue(product.category?.name || "N/A"),
        escapeCsvValue(product.description || "N/A"),
        escapeCsvValue(product.costPrice),
        escapeCsvValue(product.mrp),
        escapeCsvValue(product.length || "N/A"),
        escapeCsvValue(product.breadth || "N/A"),
        escapeCsvValue(product.height || "N/A"),
        escapeCsvValue(product.weight || "N/A"),
        escapeCsvValue(totalStock),
        escapeCsvValue(variationsStr),
        escapeCsvValue(discountsStr),
      ];
      csvRows.push(row.join(","));
    });

    res.send(csvRows.join("\n"));
  }
}
