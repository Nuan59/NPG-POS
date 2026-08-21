// FinancialCostProfitPie.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/FinancialCostProfitPie.tsx
"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { OverviewData, PIE_COLORS, fmt } from "../util/financialTypes";

interface FinancialCostProfitPieProps {
  overview: OverviewData;
}

const FinancialCostProfitPie = ({ overview }: FinancialCostProfitPieProps) => {
  const data = [
    { name: "กำไรสุทธิ", value: Math.max(overview.net_profit, 0) },
    { name: "ต้นทุนรถ", value: overview.total_cost },
    { name: "ต้นทุนของแถม", value: overview.total_additional_fees },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">สัดส่วนต้นทุนและกำไร</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) =>
              overview.total_revenue > 0
                ? `${entry.name}: ${((entry.value / overview.total_revenue) * 100).toFixed(1)}%`
                : ""
            }
            outerRadius={100}
            dataKey="value"
          >
            {[0, 1, 2].map((index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${fmt(value)} บาท`, ""]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinancialCostProfitPie;