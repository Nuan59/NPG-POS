// SalesFilters.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/SalesFilters.tsx
"use client";

import { MONTHS } from "../util/index";

interface SalesFiltersProps {
  selectedYear: string;
  selectedMonth: string;
  years: string[];
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
}

const SalesFilters = ({
  selectedYear,
  selectedMonth,
  years,
  onYearChange,
  onMonthChange,
}: SalesFiltersProps) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <h2 className="text-2xl font-bold">รายงานยอดขาย</h2>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">ปี:</span>
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
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">เดือน:</span>
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            disabled={selectedYear === "all"}
            className="px-4 py-2 border rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
            title={selectedYear === "all" ? "เลือกปีก่อนจึงจะเลือกเดือนได้" : ""}
          >
            <option value="all">ทุกเดือน</option>
            {MONTHS.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default SalesFilters;