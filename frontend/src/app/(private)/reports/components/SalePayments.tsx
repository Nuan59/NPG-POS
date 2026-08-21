// SalePayments.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/SalePayments.tsx
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
import { classifyPaymentGroup } from "../util/salesHelpers";
import { generateNpgReadableColor, resetGeneratedColors } from "../util/colors";

interface SalePaymentsProps {
  // ✅ orders ที่กรองปี/เดือนมาแล้วจาก SalesReports (parent)
  orders: IOrder[];
}

const SalePayments = ({ orders }: SalePaymentsProps) => {
  const data = useMemo(() => {
    resetGeneratedColors();

    const grouped: Record<string, number> = {
      "เงินสด": 0,
      "ไฟแนนซ์": 0,
      "ผ่อนกับร้าน": 0,
    };

    for (const order of orders) {
      const group = classifyPaymentGroup(order.payment_method || "");
      const bikeCount = (order.bikes || []).length || 1;
      grouped[group] += bikeCount;
    }

    return Object.entries(grouped)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value, color: generateNpgReadableColor() }));
  }, [orders]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center w-full h-64">
        <p className="text-gray-500">ไม่มีข้อมูลยอดขายในช่วงที่เลือก</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h2 className="mb-4 text-xl font-semibold">ยอดขายแยกตามวิธีชำระเงิน</h2>

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
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded" style={{ backgroundColor: item.color }} />
              <div className="flex flex-col">
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-2xl font-bold">{item.value} คัน</span>
              </div>
            </div>
          ))}
          <div className="mt-2 pt-4 border-t">
            <span className="text-sm text-gray-600">รวมทั้งหมด</span>
            <div className="text-3xl font-bold text-orange-600">{total} คัน</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalePayments;