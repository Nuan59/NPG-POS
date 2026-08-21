// FinancialChartTooltip.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/FinancialChartTooltip.tsx
"use client";

import { fmt } from "../util/financialTypes";

// ✅ Tooltip กลาง ใช้ร่วมกันทั้งกราฟเส้น (FinancialMonthlyTrendChart)
// และกราฟแท่ง (FinancialMonthlyProfitBarChart)
const FinancialChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {fmt(entry.value)} บาท
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default FinancialChartTooltip;