"use client";

import React, { useEffect, useMemo, useState } from "react";
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

import {
  getSalesVolumeReport,
  getSalesByVehicleTypeReport, // ✅ เพิ่ม: เรียก API รถใหม่/มือสอง
} from "@/services/ReportsService";

import { fillMissingMonths } from "../util/index";

/* =======================
   🎨 สี
======================= */
const COLOR_YEAR_BASE = [
  "#9CA3AF", // เทา
  "#F36B21", // ส้มเข้ม
  "#FDBA74", // ส้มอ่อน
];

const COLOR_NEW = "#F36B21";   // รถใหม่
const COLOR_USED = "#9CA3AF"; // รถมือสอง

const getYearColor = (year: number) =>
  COLOR_YEAR_BASE[year % COLOR_YEAR_BASE.length];

/* =======================
   🧠 Normalize ปี (รองรับ พ.ศ.)
======================= */
const normalizeYear = (rawYear: any): number => {
  const y = Number(String(rawYear).match(/\d{4}/)?.[0]);
  if (!y) return 0;
  return y > 2500 ? y - 543 : y;
};

type SaleRow = {
  year: number;
  month: string;
  total: number; // จำนวนคันรวม
};

type ConditionRow = {
  year: number;
  month: string;
  new: number;
  pre_owned: number;
};

const SaleTrends = () => {
  /* =======================
     state
  ======================= */
  const [rawData, setRawData] = useState<SaleRow[]>([]);
  const [conditionData, setConditionData] = useState<ConditionRow[]>([]);

  /* =======================
     ดึงข้อมูลกราฟบน (ยอดขายรวม)
  ======================= */
  useEffect(() => {
    const getData = async () => {
      const res = await getSalesVolumeReport();

      const normalized: SaleRow[] = fillMissingMonths(res.data).map(
        (item: any) => ({
          year: normalizeYear(item.year),
          month: item.month,
          total: Number(item.total_sales ?? 0),
        })
      );

      setRawData(normalized);
    };

    getData();
  }, []);

  /* =======================
     ✅ ดึงข้อมูลกราฟล่าง (รถใหม่ / รถมือสอง)
     ใช้ API ใหม่โดยตรง ไม่พึ่ง rawData
  ======================= */
  useEffect(() => {
    const getConditionData = async () => {
      const res = await getSalesByVehicleTypeReport();
      setConditionData(res.data.data ?? []);
    };

    getConditionData();
  }, []);

  /* =======================
     🔹 กราฟบน : ยอดขายรายเดือน (แยกปี)
  ======================= */
  const salesByYearData = useMemo(() => {
    const map = new Map<string, any>();

    rawData.forEach((row) => {
      if (!map.has(row.month)) {
        map.set(row.month, { month: row.month });
      }
      map.get(row.month)[`year_${row.year}`] = row.total;
    });

    return Array.from(map.values());
  }, [rawData]);

  const years = useMemo(
    () => Array.from(new Set(rawData.map((d) => d.year))).sort(),
    [rawData]
  );

  /* =======================
     🔹 กราฟล่าง : รถใหม่ / รถมือสอง
     (ใช้ข้อมูลจาก backend ตรง ๆ)
  ======================= */
  const conditionChartData = useMemo(() => {
    return conditionData.map((item) => ({
      month: item.month,
      new: item.new,
      pre_owned: item.pre_owned,
    }));
  }, [conditionData]);

  return (
    <div className="flex flex-col w-full gap-10">
      {/* =======================
          กราฟบน : ยอดขายรายเดือน
      ======================= */}
      <div className="flex flex-col items-center justify-center w-full">
        <h2 className="mb-2">ยอดขายรายเดือน (จำนวนคัน)</h2>

        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={salesByYearData}>
            <CartesianGrid stroke="#E5E7EB" />
            <XAxis dataKey="month" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />

            {years.map((year) => (
              <Line
                key={year}
                type="monotone"
                dataKey={`year_${year}`}
                name={String(year)}
                stroke={getYearColor(year)}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SaleTrends;