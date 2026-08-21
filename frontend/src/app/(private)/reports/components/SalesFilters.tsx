// SalesFilters.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/SalesFilters.tsx
"use client";

import NextLink from "next/link";
import { Printer } from "lucide-react";
import { MONTHS } from "../util/index";

interface SalesFiltersProps {
  selectedYear: string;
  selectedMonth: string;
  years: string[];
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
  // ✅ ถ้า true จะล็อกปีไว้ ไม่ให้เปลี่ยนปีอื่นได้เลย (แสดงเป็นข้อความแทน dropdown)
  // ใช้เฉพาะรายงาน "ขาย" ตามที่ขอ - จำกัดให้ดูได้แค่ปีที่ระบุเท่านั้น
  lockYear?: boolean;
}

const SalesFilters = ({
  selectedYear,
  selectedMonth,
  years,
  onYearChange,
  onMonthChange,
  lockYear = false,
}: SalesFiltersProps) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <h2 className="text-2xl font-bold">รายงานยอดขาย</h2>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">ปี:</span>
          {lockYear ? (
            <span className="px-4 py-2 border rounded-lg text-sm bg-gray-50 font-medium">
              {parseInt(selectedYear) + 543}
            </span>
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => {
                onYearChange(e.target.value);
                onMonthChange("all"); // เปลี่ยนปีแล้วรีเซ็ตเดือน กันเลือกเดือนที่ไม่มีข้อมูลในปีใหม่
              }}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              <option value="all">ทุกปี</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {parseInt(year) + 543}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">เดือน:</span>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            disabled={!lockYear && selectedYear === "all"}
            className="px-4 py-2 border rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
            title={!lockYear && selectedYear === "all" ? "เลือกปีก่อนจึงจะเลือกเดือนได้" : ""}
          >
            <option value="all">ทุกเดือน</option>
            {MONTHS.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <NextLink
          href={`/reports/sales/print?year=${encodeURIComponent(selectedYear)}&month=${encodeURIComponent(selectedMonth)}`}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Printer className="h-4 w-4" />
          พิมพ์รายงาน
        </NextLink>
      </div>
    </div>
  );
};

export default SalesFilters;