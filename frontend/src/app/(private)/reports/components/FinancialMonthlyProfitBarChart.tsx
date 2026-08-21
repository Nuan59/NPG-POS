// FinancialMonthlyProfitBarChart.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/FinancialMonthlyProfitBarChart.tsx
"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { FinancialData } from "../util/financialTypes";
import FinancialChartTooltip from "./FinancialChartTooltip";

interface FinancialMonthlyProfitBarChartProps {
  data: FinancialData[];
}

const FinancialMonthlyProfitBarChart = ({ data }: FinancialMonthlyProfitBarChartProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold mb-4">กำไรแยกตามเดือน</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" style={{ fontSize: "10px" }} />
          <YAxis style={{ fontSize: "10px" }} />
          <Tooltip content={<FinancialChartTooltip />} />
          <Legend />
          <Bar dataKey="gross_profit" name="กำไรขั้นต้น (ก่อนหักของแถม)" fill="#8884d8" />
          <Bar dataKey="additional_fees" name="ต้นทุนของแถม" fill="#f97316" />
          <Bar dataKey="net_profit" name="กำไรสุทธิ" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FinancialMonthlyProfitBarChart;