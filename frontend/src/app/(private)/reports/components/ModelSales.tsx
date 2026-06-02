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
import { getSalesByModelReport } from "@/services/ReportsService";
import { MONTHS } from "../util/index";

const normalizeYear = (rawYear: any): number => {
  const y = Number(String(rawYear).match(/\d{4}/)?.[0]);
  if (!y) return 0;
  return y > 2500 ? y - 543 : y;
};

type ModelSalesRow = {
  year: number;
  month: string;
  model_name: string;
  total: number;
};

const MODEL_COLORS = [
  "#F36B21","#3B82F6","#10B981","#8B5CF6",
  "#EF4444","#F59E0B","#EC4899","#06B6D4",
  "#84CC16","#F97316","#6366F1","#14B8A6",
];

const YEAR_COLORS: Record<number, string> = {
  2023: "#9CA3AF",
  2024: "#FDBA74",
  2025: "#F36B21",
  2026: "#3B82F6",
};

const ModelSales = () => {
  const [rawData, setRawData] = useState<ModelSalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res: any = await getSalesByModelReport();
        if (res?.data && Array.isArray(res.data)) {
          const normalized: ModelSalesRow[] = res.data.map((item: any) => ({
            year: normalizeYear(item.year),
            month: item.month,
            model_name: item.model_name || "ไม่ระบุ",
            total: Number(item.total ?? 0),
          }));
          setRawData(normalized);
          const years = Array.from(new Set(normalized.map(d => d.year))).sort();
          setSelectedYears(new Set(years));
        }
      } catch (error) {
        console.error("❌ Error fetching model sales data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const allYears = useMemo(
    () => Array.from(new Set(rawData.map(d => d.year))).sort(),
    [rawData]
  );

  const allModels = useMemo(
    () => Array.from(new Set(rawData.map(d => d.model_name))).sort(),
    [rawData]
  );

  // กรองข้อมูลตามปีที่เลือก
  const filteredData = useMemo(
    () => rawData.filter(d => selectedYears.has(d.year)),
    [rawData, selectedYears]
  );

  // ถ้าเลือกหลายปี → รวมยอดแต่ละรุ่น-เดือน
  // ถ้าเลือกปีเดียว → แยกตามรุ่น
  const chartData = useMemo(() => {
    if (filteredData.length === 0) return [];

    return MONTHS.map((month) => {
      const row: any = { month };
      allModels.forEach((model) => {
        const total = filteredData
          .filter(d => d.month === month && d.model_name === model)
          .reduce((sum, d) => sum + d.total, 0);
        row[model] = total;
      });
      return row;
    });
  }, [filteredData, allModels]);

  const toggleYear = (year: number) => {
    setSelectedYears(prev => {
      const next = new Set(prev);
      if (next.has(year) && next.size > 1) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedYears.size === allYears.length) {
      setSelectedYears(new Set([allYears[allYears.length - 1]]));
    } else {
      setSelectedYears(new Set(allYears));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">กำลังโหลด...</p>
    </div>
  );

  if (chartData.length === 0) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">ไม่มีข้อมูลยอดขาย</p>
    </div>
  );

  const isAllSelected = selectedYears.size === allYears.length;

  return (
    <div className="flex flex-col items-center w-full">
      <h2 className="mb-3">ยอดขายแยกตามรุ่นรถ (รายเดือน)</h2>

      {/* ปุ่มเลือกปี */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={toggleAll}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${
            isAllSelected
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-300"
          }`}
        >
          ทั้งหมด
        </button>
        {allYears.map(year => {
          const color = YEAR_COLORS[year] || "#888";
          const active = selectedYears.has(year);
          return (
            <button
              key={year}
              onClick={() => toggleYear(year)}
              style={{
                borderColor: color,
                backgroundColor: active ? color : "transparent",
                color: active ? "#fff" : color,
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all"
            >
              {year}
            </button>
          );
        })}
      </div>

      {/* label ว่าดูอะไรอยู่ */}
      <p className="text-xs text-gray-400 mb-3">
        {isAllSelected
          ? "แสดงยอดรวมทุกปี แยกตามรุ่นรถ"
          : `แสดงปี ${[...selectedYears].sort().join(", ")} แยกตามรุ่นรถ`}
      </p>

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
          {allModels.map((model, idx) => (
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