// VehicleTypeSales.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/VehicleTypeSales.tsx
"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import { IOrder } from "@/types/Order";

const COLOR_NEW = "#F36B21";      // ส้มเข้ม - รถใหม่
const COLOR_PRE_OWNED = "#9CA3AF"; // เทา - รถมือสอง

interface VehicleTypeSalesProps {
  // ✅ orders ที่กรองปี/เดือนมาแล้วจาก SalesReports (parent)
  orders: IOrder[];
}

const VehicleTypeSales = ({ orders }: VehicleTypeSalesProps) => {
  const { newCount, usedCount } = useMemo(() => {
    let newCount = 0;
    let usedCount = 0;
    for (const order of orders) {
      for (const bike of order.bikes || []) {
        if (bike.category === "new") newCount += 1;
        else usedCount += 1;
      }
    }
    return { newCount, usedCount };
  }, [orders]);

  const total = newCount + usedCount;

  if (total === 0) {
    return (
      <div className="flex items-center justify-center w-full h-64">
        <p className="text-gray-500">ไม่มีข้อมูลยอดขายในช่วงที่เลือก</p>
      </div>
    );
  }

  const data = [
    { name: "รถใหม่", value: newCount, color: COLOR_NEW },
    { name: "รถมือสอง", value: usedCount, color: COLOR_PRE_OWNED },
  ];

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h2 className="mb-4 text-xl font-semibold">รถใหม่ vs รถมือสอง</h2>

      <div className="flex flex-row items-center justify-center gap-10 w-full">
        <ResponsiveContainer width="50%" height={320}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, percent }) =>
                `${name}: ${value} คัน (${(percent * 100).toFixed(1)}%)`
              }
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} คัน`, ""]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded" style={{ backgroundColor: COLOR_NEW }} />
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">รถใหม่</span>
              <span className="text-2xl font-bold">{newCount} คัน</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded" style={{ backgroundColor: COLOR_PRE_OWNED }} />
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">รถมือสอง</span>
              <span className="text-2xl font-bold">{usedCount} คัน</span>
            </div>
          </div>
          <div className="mt-2 pt-4 border-t">
            <span className="text-sm text-gray-600">รวมทั้งหมด</span>
            <div className="text-3xl font-bold text-orange-600">{total} คัน</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleTypeSales;