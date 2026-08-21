// SalesFilters.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/SalesFilters.tsx
"use client";

import NextLink from "next/link";
import { Printer } from "lucide-react";
import MonthMultiSelect from "./MonthMultiSelect";

interface SalesFiltersProps {
  selectedYear: string;
  selectedMonths: string[]; // ว่าง = ทุกเดือน
  years: string[];
  onYearChange: (year: string) => void;
  onMonthsChange: (months: string[]) => void;
}

const SalesFilters = ({
  selectedYear,
  selectedMonths,
  years,
  onYearChange,
  onMonthsChange,
}: SalesFiltersProps) => {
  // ✅ ส่งเดือนที่เลือกไปหน้าพิมพ์รายงานแบบ comma-separated เช่น "มกราคม,กุมภาพันธ์"
  const monthParam = selectedMonths.length > 0 ? selectedMonths.join(",") : "all";

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <h2 className="text-2xl font-bold">รายงานยอดขาย</h2>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">ปี:</span>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm"
          >
            <option value="all">ทุกปี</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {parseInt(year) + 543}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">เดือน:</span>
          <MonthMultiSelect selectedMonths={selectedMonths} onChange={onMonthsChange} />
        </div>

        <NextLink
          href={`/reports/sales/print?year=${encodeURIComponent(selectedYear)}&month=${encodeURIComponent(monthParam)}`}
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