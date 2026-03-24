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

/* =======================
   🧠 Normalize ปี (รองรับ พ.ศ.)
======================= */
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

/* =======================
   🎨 กำหนดสีพื้นฐานสำหรับแต่ละรุ่นรถ
======================= */
const BASE_MODEL_COLORS: Record<string, string> = {
  "WAVE110i": "#3B82F6",      // น้ำเงิน
  "Click125i": "#10B981",     // เขียว
  "PCX160": "#F59E0B",        // ส้ม
  "ADV160": "#EF4444",        // แดง
  "Scoopy": "#8B5CF6",        // ม่วง
  "Beat": "#EC4899",          // ชมพู
  "CBR150R": "#06B6D4",       // ฟ้า
  "CRF250L": "#84CC16",       // เขียวมะนาว
  "Forza350": "#F97316",      // ส้มเข้ม
  "PCX125": "#FBBF24",        // เหลือง
};

/* =======================
   🎨 ปรับโทนสีตามปี (ปีล่าสุด = สีเข้มที่สุด, ปีก่อนหน้า = สีอ่อนลง)
======================= */
const adjustColorByYear = (baseColor: string, yearIndex: number, totalYears: number): string => {
  // Convert hex to RGB
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  
  // คำนวณความเข้มของสี (ปีล่าสุด = 1.0, ปีก่อนๆ = ลดลง)
  // ใช้ช่วง 0.5 - 1.0 เพื่อให้ยังมองเห็นได้ชัดเจน
  const intensity = 0.5 + (yearIndex / Math.max(totalYears - 1, 1)) * 0.5;
  
  // ปรับความสว่างของสี
  const newR = Math.round(255 - (255 - r) * intensity);
  const newG = Math.round(255 - (255 - g) * intensity);
  const newB = Math.round(255 - (255 - b) * intensity);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

/* =======================
   🎨 สร้างสีสำหรับรุ่นที่ไม่มีในรายการ
======================= */
const generateFallbackColor = (index: number): string => {
  const colors = [
    "#6366F1", "#14B8A6", "#F43F5E", "#A855F7", 
    "#0EA5E9", "#22C55E", "#EAB308", "#EC4899"
  ];
  return colors[index % colors.length];
};

const ModelSales = () => {
  const [rawData, setRawData] = useState<ModelSalesRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res: any = await getSalesByModelReport();

        if (res?.data && Array.isArray(res.data)) {
          // Normalize ข้อมูล
          const normalized: ModelSalesRow[] = res.data.map((item: any) => ({
            year: normalizeYear(item.year),
            month: item.month,
            model_name: item.model_name || "ไม่ระบุ",
            total: Number(item.total ?? 0),
          }));

          setRawData(normalized);
        }
      } catch (error) {
        console.error("❌ Error fetching model sales data:", error);
        setRawData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* =======================
     📊 จัดข้อมูลสำหรับกราฟ (เติมเดือนที่ขาด)
  ======================= */
  const chartData = useMemo(() => {
    if (rawData.length === 0) return [];

    // หาปีและรุ่นทั้งหมด
    const years = Array.from(new Set(rawData.map(d => d.year))).sort();
    const models = Array.from(new Set(rawData.map(d => d.model_name))).sort();

    // สร้างข้อมูลครบทุกเดือน
    return MONTHS.map((month) => {
      const monthData: any = { month };

      // เติมข้อมูลแต่ละปี-รุ่น
      years.forEach((year) => {
        models.forEach((model) => {
          const key = `${year}_${model}`;
          
          // หาข้อมูลจริง
          const found = rawData.find(
            (d) => d.year === year && d.month === month && d.model_name === model
          );

          monthData[key] = found ? found.total : 0; // ✅ เติม 0 ถ้าไม่มีข้อมูล
        });
      });

      return monthData;
    });
  }, [rawData]);

  /* =======================
     📊 หาคู่ปี-รุ่นทั้งหมด และเรียงลำดับ
  ======================= */
  const yearModelData = useMemo(() => {
    const years = Array.from(new Set(rawData.map(d => d.year))).sort(); // เรียงปีจากน้อย -> มาก
    const models = Array.from(new Set(rawData.map(d => d.model_name))).sort();
    
    const combinations: Array<{key: string, year: number, model: string}> = [];
    
    // จัดกลุ่มตามรุ่น แล้วเรียงตามปี
    models.forEach(model => {
      years.forEach(year => {
        const hasData = rawData.some(d => d.year === year && d.model_name === model);
        if (hasData) {
          combinations.push({
            key: `${year}_${model}`,
            year,
            model
          });
        }
      });
    });
    
    return combinations;
  }, [rawData]);

  /* =======================
     🎨 กำหนดสีให้แต่ละเส้น
  ======================= */
  const lineColors = useMemo(() => {
    const colors: Record<string, string> = {};
    const modelYearCount: Record<string, number> = {};
    
    // นับจำนวนปีของแต่ละรุ่น
    yearModelData.forEach(({ model }) => {
      modelYearCount[model] = (modelYearCount[model] || 0) + 1;
    });
    
    // กำหนดสีให้แต่ละรุ่น
    const modelBaseColors: Record<string, string> = {};
    const usedModels = Array.from(new Set(yearModelData.map(d => d.model)));
    
    usedModels.forEach((model, idx) => {
      modelBaseColors[model] = BASE_MODEL_COLORS[model] || generateFallbackColor(idx);
    });
    
    // กำหนดสีให้แต่ละคู่ปี-รุ่น
    const modelYearIndex: Record<string, number> = {};
    
    yearModelData.forEach(({ key, model }) => {
      if (!modelYearIndex[model]) {
        modelYearIndex[model] = 0;
      }
      
      const baseColor = modelBaseColors[model];
      const yearIndex = modelYearIndex[model];
      const totalYears = modelYearCount[model];
      
      colors[key] = adjustColorByYear(baseColor, yearIndex, totalYears);
      modelYearIndex[model]++;
    });

    return colors;
  }, [yearModelData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-64">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-64">
        <p className="text-gray-500">ไม่มีข้อมูลยอดขาย</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h2 className="mb-2">ยอดขายแยกตามรุ่นรถ (รายเดือน)</h2>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData}>
          <CartesianGrid stroke="#E5E7EB" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip 
            formatter={(value: number, name: string) => {
              // แปลง key เช่น "2025_WAVE110i" เป็น "WAVE110i 2025"
              const parts = String(name).split('_');
              const year = parts[0];
              const modelName = parts.slice(1).join('_');
              const displayName = `${modelName} ${year}`;
              return [`${value} คัน`, displayName];
            }}
          />
          <Legend 
            formatter={(value: string) => {
              // แสดง Legend เป็น "รุ่นรถ ปี" เช่น "WAVE110i 2025"
              const parts = value.split('_');
              const year = parts[0];
              const modelName = parts.slice(1).join('_');
              return `${modelName} ${year}`;
            }}
          />

          {/* สร้างเส้นสำหรับแต่ละคู่ปี-รุ่น */}
          {yearModelData.map(({ key }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={lineColors[key]}
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