// exportReport.ts
// วางไฟล์นี้ใน: src/app/(private)/cashflow/util/exportReport.ts
// ต้องติดตั้งแพ็กเกจก่อน: npm install xlsx
import * as XLSX from "xlsx";
import { CashflowMonthData } from "@/services/CashflowService";
import { UIRow, TYPE_LABEL, signedAmount, DayCashflowData } from "./cashflowUtil";

type DailyExportInput = DayCashflowData;

const rowsToAOA = (rows: UIRow[], opening: number) => {
  let running = opening;
  const aoa: (string | number)[][] = [["รายการ", "ประเภท", "จำนวนเงิน", "คงเหลือ", "โดย"]];
  aoa.push(["ยอดยกมา", "-", "-", opening, ""]);
  rows.forEach((r) => {
    running += signedAmount(r);
    aoa.push([r.description, TYPE_LABEL[r.type], Number(r.amount) || 0, running, r.createdBy || ""]);
  });
  return aoa;
};

export function exportDailyExcel(input: DailyExportInput) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(rowsToAOA(input.cashRows, input.cashOpening)),
    "เงินสด"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(rowsToAOA(input.transferRows, input.transferOpening)),
    "โอน"
  );

  const summaryAoa: (string | number)[][] = [
    ["วันที่", input.date],
    ["ยอดคงเหลือเงินสด", input.cashClosing],
    ["ยอดคงเหลือโอน", input.transferClosing],
    ["รวมทั้งหมด", input.cashClosing + input.transferClosing],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryAoa), "สรุป");

  XLSX.writeFile(wb, `รายรับรายจ่าย-${input.date}.xlsx`);
}

export function exportMonthlyExcel(monthData: CashflowMonthData) {
  const wb = XLSX.utils.book_new();

  const cashNet =
    monthData.cashTotals.income - monthData.cashTotals.sent - monthData.cashTotals.expense -
    monthData.cashTotals.change - monthData.cashTotals.deposit_return + monthData.cashTotals.cash_in;
  const transferNet =
    monthData.transferTotals.income - monthData.transferTotals.sent - monthData.transferTotals.expense -
    monthData.transferTotals.change - monthData.transferTotals.deposit_return + monthData.transferTotals.cash_in;

  const aoa: (string | number)[][] = [
    ["เดือน", monthData.month],
    [],
    ["รวมสุทธิ (เงินสด)", cashNet],
    ["รวมสุทธิ (โอน)", transferNet],
    [],
    ["วันที่", "คงเหลือเงินสด", "คงเหลือโอน"],
    ...monthData.days.map((d) => [d.date, d.cashClosing, d.transferClosing]),
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "สรุปเดือน");
  XLSX.writeFile(wb, `สรุปรายเดือน-${monthData.month}.xlsx`);
}

export function exportRangeExcel(days: DayCashflowData[]) {
  const wb = XLSX.utils.book_new();

  const netCash = days.reduce((sum, d) => sum + d.cashRows.reduce((s, r) => s + signedAmount(r), 0), 0);
  const netTransfer = days.reduce((sum, d) => sum + d.transferRows.reduce((s, r) => s + signedAmount(r), 0), 0);
  const fromDate = days[0]?.date || "";
  const toDate = days[days.length - 1]?.date || "";

  const summaryAoa: (string | number)[][] = [
    ["ช่วงวันที่", `${fromDate} ถึง ${toDate}`],
    ["รวมสุทธิ (เงินสด)", netCash],
    ["รวมสุทธิ (โอน)", netTransfer],
    [],
    ["วันที่", "คงเหลือเงินสด", "คงเหลือโอน"],
    ...days.map((d) => [d.date, d.cashClosing, d.transferClosing]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryAoa), "สรุปรายวัน");

  const detailAoa: (string | number)[][] = [["วันที่", "บัญชี", "รายการ", "ประเภท", "จำนวนเงิน", "โดย"]];
  days.forEach((d) => {
    d.cashRows.forEach((r) =>
      detailAoa.push([d.date, "เงินสด", r.description, TYPE_LABEL[r.type], Number(r.amount) || 0, r.createdBy || ""])
    );
    d.transferRows.forEach((r) =>
      detailAoa.push([d.date, "โอน", r.description, TYPE_LABEL[r.type], Number(r.amount) || 0, r.createdBy || ""])
    );
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailAoa), "รายละเอียด");

  XLSX.writeFile(wb, `รายรับรายจ่าย-${fromDate}_ถึง_${toDate}.xlsx`);
}