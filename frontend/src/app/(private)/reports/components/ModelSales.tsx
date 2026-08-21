// ModelSales.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/ModelSales.tsx
"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { IOrder } from "@/types/Order";
import { MONTHS } from "../util/index";

const MODEL_COLORS = [
  "#F36B21","#3B82F6","#10B981","#8B5CF6",
  "#EF4444","#F59E0B","#EC4899","#06B6D4",
  "#84CC16","#F97316","#6366F1","#14B8A6",
];

interface ModelSalesProps {
  // ✅ orders ที่กรองปี/เดือนมาแล้วจาก SalesReports (parent) - ไม่ยิง API เอง
  orders: IOrder[];
}

const ModelSales = ({ orders }: ModelSalesProps) => {
  const { chartData, activeModels } = useMemo(() => {
    // นับจำนวนคันขายต่อ (เดือน, รุ่นรถ)
    const counts = new Map<string, Map<string, number>>(); // month -> model -> count
    const modelSet = new Set<string>();

    for (const order of orders) {
      if (!order.sale_date) continue;
      const month = MONTHS[new Date(order.sale_date).getMonth()];
      for (const bike of order.bikes || []) {
        const model = bike.model_name || "ไม่ระบุ";
        modelSet.add(model);
        if (!counts.has(month)) counts.set(month, new Map());
        const monthMap = counts.get(month)!;
        monthMap.set(model, (monthMap.get(model) || 0) + 1);
      }
    }

    const activeModels = Array.from(modelSet).sort();

    const chartData = MONTHS.map((month) => {
      const row: any = { month };
      const monthMap = counts.get(month);
      activeModels.forEach((model) => {
        row[model] = monthMap?.get(model) || null; // null = ไม่แสดงจุด
      });
      return row;
    });

    return { chartData, activeModels };
  }, [orders]);

  if (activeModels.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">ไม่มีข้อมูลยอดขายในช่วงที่เลือก</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="mb-3">ยอดขายแยกตามรุ่นรถ (รายเดือน)</h2>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid stroke="#E5E7EB" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number, name: string) => [`${value} คัน`, name]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value) => value}
          />
          {activeModels.map((model, idx) => (
            <Line
              key={model}
              type="monotone"
              dataKey={model}
              name={model}
              stroke={MODEL_COLORS[idx % MODEL_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ModelSales;