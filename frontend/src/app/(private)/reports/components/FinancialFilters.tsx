// FinancialFilters.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/FinancialFilters.tsx
"use client";

import NextLink from "next/link";
import { Printer } from "lucide-react";
import { MONTHS } from "../util/index";

interface FinancialFiltersProps {
  selectedYear: string;
  selectedMonth: string;
  years: string[];
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
}

const FinancialFilters = ({
  selectedYear,
  selectedMonth,
  years,
  onYearChange,
  onMonthChange,
}: FinancialFiltersProps) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 className="text-3xl font-bold">รายงานการเงิน</h2>
        <p className="text-gray-600 mt-1">สรุปรายได้ ต้นทุน และกำไร</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">ปี:</span>
          <select
            value={selectedYear}
            onChange={(e) => {
              onYearChange(e.target.value);
              onMonthChange("all"); // เปลี่ยนปีแล้วรีเซ็ตเดือน กันเลือกเดือนที่ไม่มีข้อมูลในปีใหม่
            }}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">ทั้งหมด</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {parseInt(year) + 543}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">เดือน:</span>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            disabled={selectedYear === "all"}
            className="px-4 py-2 border rounded-lg disabled:bg-gray-100 disabled:text-gray-400"
            title={selectedYear === "all" ? "เลือกปีก่อนจึงจะเลือกเดือนได้" : ""}
          >
            <option value="all">ทั้งหมด</option>
            {MONTHS.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <NextLink
          href={`/reports/financial/print?year=${encodeURIComponent(selectedYear)}&month=${encodeURIComponent(selectedMonth)}`}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Printer className="h-4 w-4" />
          พิมพ์รายงาน
        </NextLink>
      </div>
    </div>
  );
};

export default FinancialFilters;