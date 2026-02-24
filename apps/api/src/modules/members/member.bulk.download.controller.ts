/**
 * Member bulk download controller — template and export (Excel/CSV).
 */
import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { getValidatedQuery } from "@/middlewares/validateRequest";
import { fail } from "@/shared/response";
import { membersRepository } from "./members.repository";

export async function downloadBulkUploadTemplate(
  _req: Request,
  res: Response,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Members Template");

  const headers = [
    { header: "SN", width: 8 },
    { header: "ID (member_id UUID)", width: 22 },
    { header: "Name", width: 20 },
    { header: "Address", width: 25 },
    { header: "Phone", width: 15 },
    { header: "DoB", width: 12 },
    { header: "Notes", width: 25 },
    { header: "Member since", width: 15 },
  ];
  const requiredOptional = [
    "Optional",
    "Optional",
    "Optional",
    "Optional",
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

  const filename = "members_bulk_upload_template.xlsx";
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  const buffer = await workbook.xlsx.writeBuffer();
  res.send(buffer);
}

export async function downloadMembers(
  req: Request,
  res: Response,
): Promise<Response | void> {
  const auth = req.authContext!;

  const { format = "excel", ids: idsParam } = getValidatedQuery<{
    format?: "excel" | "csv";
    ids?: string;
  }>(req, res);

  if (format !== "excel" && format !== "csv") {
    return fail(res, "Invalid format. Supported formats: excel, csv", 400);
  }

  let memberIds: string[] | undefined;
  if (idsParam) {
    memberIds = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  const where: { tenantId: string; id?: { in: string[] } } = {
    tenantId: auth.tenantId,
  };
  if (memberIds && memberIds.length > 0) {
    where.id = { in: memberIds };
  }

  const members = await membersRepository.findMembersForExport({
    where,
    orderBy: { createdAt: "desc" },
  });

  if (members.length === 0) {
    fail(res, "No members found to export", 404);
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Members");

  const columns = [
    { header: "Phone", key: "phone", width: 15 },
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Status", key: "status", width: 12 },
    { header: "Total Sales", key: "totalSales", width: 12 },
    { header: "Gender", key: "gender", width: 10 },
    { header: "Age", key: "age", width: 10 },
    { header: "Address", key: "address", width: 40 },
    { header: "Birthday", key: "birthday", width: 15 },
    { header: "Member Since", key: "memberSince", width: 15 },
    { header: "Created At", key: "createdAt", width: 20 },
    { header: "Notes", key: "notes", width: 40 },
  ];

  worksheet.columns = columns;
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  members.forEach((member) => {
    worksheet.addRow({
      phone: member.phone,
      name: member.name || "N/A",
      email: member.email || "N/A",
      status: member.isActive ? "Active" : "Inactive",
      totalSales: member._count?.sales || 0,
      gender: member.gender || "N/A",
      age: member.age || "N/A",
      address: member.address || "N/A",
      birthday: member.birthday
        ? new Date(member.birthday).toLocaleDateString()
        : "N/A",
      memberSince: member.memberSince
        ? new Date(member.memberSince).toLocaleDateString()
        : "N/A",
      createdAt: new Date(member.createdAt).toLocaleString(),
      notes: member.notes || "N/A",
    });
  });

  const timestamp = new Date().toISOString().split("T")[0];
  const filename = `members_${timestamp}.${format === "excel" ? "xlsx" : "csv"}`;

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
    members.forEach((member) => {
      csvRows.push(
        [
          member.phone,
          member.name || "N/A",
          member.email || "N/A",
          member.isActive ? "Active" : "Inactive",
          member._count?.sales || 0,
          member.gender || "N/A",
          member.age || "N/A",
          member.address || "N/A",
          member.birthday
            ? new Date(member.birthday).toLocaleDateString()
            : "N/A",
          member.memberSince
            ? new Date(member.memberSince).toLocaleDateString()
            : "N/A",
          new Date(member.createdAt).toLocaleString(),
          member.notes || "N/A",
        ]
          .map(escapeCsvValue)
          .join(","),
      );
    });

    res.send(csvRows.join("\n"));
  }
}
