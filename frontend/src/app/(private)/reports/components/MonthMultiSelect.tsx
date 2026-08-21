// MonthMultiSelect.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/MonthMultiSelect.tsx
"use client";

import { MONTHS } from "../util/index";

interface MonthMultiSelectProps {
  selectedMonths: string[]; // ว่าง = ทุกเดือน
  onChange: (months: string[]) => void;
}

const MonthMultiSelect = ({ selectedMonths, onChange }: MonthMultiSelectProps) => {
  const toggle = (month: string) => {
    if (selectedMonths.includes(month)) {
      onChange(selectedMonths.filter((m) => m !== month));
    } else {
      onChange([...selectedMonths, month]);
    }
  };

  const label =
    selectedMonths.length === 0
      ? "ทุกเดือน"
      : selectedMonths.length === 1
      ? selectedMonths[0]
      : `${selectedMonths.length} เดือนที่เลือก`;

  return (
    // ✅ ใช้ <details>/<summary> ของ HTML ล้วนๆ ไม่ต้องพึ่ง JS state เปิด-ปิดเอง
    <details className="relative">
      <summary className="cursor-pointer px-4 py-2 border rounded-lg text-sm list-none bg-white hover:bg-gray-50 select-none">
        {label}
      </summary>
      <div className="absolute z-20 mt-1 bg-white border rounded-lg shadow-lg p-2 grid grid-cols-2 gap-0.5 w-56 right-0">
        <button
          type="button"
          onClick={() => onChange([])}
          className="col-span-2 text-left text-xs text-blue-600 hover:underline px-2 py-1"
        >
          ล้างตัวเลือก (ทุกเดือน)
        </button>
        {MONTHS.map((month) => (
          <label
            key={month}
            className="flex items-center gap-2 text-sm px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedMonths.includes(month)}
              onChange={() => toggle(month)}
            />
            {month}
          </label>
        ))}
      </div>
    </details>
  );
};

export default MonthMultiSelect;