// SaleTrends.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/SaleTrends.tsx
"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { IOrder } from "@/types/Order";
import { MONTHS } from "../util/index";

// ✅ ตัวย่อเดือนไทย ใช้โชว์บนแกน x แทนชื่อเต็ม (สั้นพอจะวางแนวนอนได้โดยไม่ต้องเอียง)
const MONTH_SHORT: Record<string, string> = {
  "มกราคม": "ม.ค.",
  "กุมภาพันธ์": "ก.พ.",
  "มีนาคม": "มี.ค.",
  "เมษายน": "เม.ย.",
  "พฤษภาคม": "พ.ค.",
  "มิถุนายน": "มิ.ย.",
  "กรกฎาคม": "ก.ค.",
  "สิงหาคม": "ส.ค.",
  "กันยายน": "ก.ย.",
  "ตุลาคม": "ต.ค.",
  "พฤศจิกายน": "พ.ย.",
  "ธันวาคม": "ธ.ค.",
};

const COLOR_TOTAL = "#3B82F6";
const COLOR_NEW = "#F36B21";   // รถใหม่
const COLOR_USED = "#9CA3AF"; // รถมือสอง

interface SaleTrendsProps {
  // ✅ orders ที่กรองปี/เดือนมาแล้วจาก SalesReports (parent)
  orders: IOrder[];
}

const SaleTrends = ({ orders }: SaleTrendsProps) => {
  const chartData = useMemo(() => {
    const totals = new Map<string, number>();
    const newCounts = new Map<string, number>();
    const usedCounts = new Map<string, number>();

    for (const order of orders) {
      if (!order.sale_date) continue;
      const month = MONTHS[new Date(order.sale_date).getMonth()];

      for (const bike of order.bikes || []) {
        totals.set(month, (totals.get(month) || 0) + 1);
        if (bike.category === "new") {
          newCounts.set(month, (newCounts.get(month) || 0) + 1);
        } else {
          usedCounts.set(month, (usedCounts.get(month) || 0) + 1);
        }
      }
    }

    return MONTHS.map((month) => ({
      month,
      total: totals.get(month) || 0,
      new: newCounts.get(month) || 0,
      pre_owned: usedCounts.get(month) || 0,
    }));
  }, [orders]);

  return (
    <div className="flex flex-col w-full gap-10">
      {/* กราฟบน : ยอดขายรวมรายเดือน */}
      <div className="flex flex-col items-center justify-center w-full">
        <h2 className="mb-2">ยอดขายรายเดือน (จำนวนคัน)</h2>

        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ bottom: 5 }}>
            <CartesianGrid stroke="#E5E7EB" />
            {/* ✅ ตัวอักษรแนวนอน ไม่เอียง + ใช้ตัวย่อเดือนให้พอดีแนวนอน + ลดขนาดกราฟลง */}
            <XAxis
              dataKey="month"
              tickFormatter={(value) => MONTH_SHORT[value] || value}
              tick={{ fontSize: 11 }}
            />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(value: number) => [`${value} คัน`, "จำนวน"]} />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              name="ยอดขายรวม"
              stroke={COLOR_TOTAL}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* กราฟล่าง : รถใหม่ / รถมือสอง รายเดือน */}
      <div className="flex flex-col items-center justify-center w-full">
        <h2 className="mb-2">รถใหม่ vs รถมือสอง (รายเดือน)</h2>

        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ bottom: 5 }}>
            <CartesianGrid stroke="#E5E7EB" />
            <XAxis
              dataKey="month"
              tickFormatter={(value) => MONTH_SHORT[value] || value}
              tick={{ fontSize: 11 }}
            />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(value: number) => [`${value} คัน`, ""]} />
            <Legend />
            <Bar dataKey="new" name="รถใหม่" fill={COLOR_NEW} />
            <Bar dataKey="pre_owned" name="รถมือสอง" fill={COLOR_USED} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SaleTrends;