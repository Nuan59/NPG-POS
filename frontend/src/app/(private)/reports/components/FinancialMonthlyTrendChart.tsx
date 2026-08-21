// FinancialMonthlyTrendChart.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/FinancialMonthlyTrendChart.tsx
"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { FinancialData } from "../util/financialTypes";
import FinancialChartTooltip from "./FinancialChartTooltip";

interface FinancialMonthlyTrendChartProps {
  data: FinancialData[];
}

const FinancialMonthlyTrendChart = ({ data }: FinancialMonthlyTrendChartProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        แนวโน้มรายเดือน
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" style={{ fontSize: "10px" }} />
          <YAxis style={{ fontSize: "10px" }} />
          <Tooltip content={<FinancialChartTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="revenue" name="รายได้" stroke="#0088FE" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="cost" name="ต้นทุนรถ" stroke="#FF8042" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="additional_fees" name="ต้นทุนของแถม" stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          <Line type="monotone" dataKey="net_profit" name="กำไรสุทธิ" stroke="#00C49F" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinancialMonthlyTrendChart;