"use client";

import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import { getVehicleTypeTotalReport } from "@/services/ReportsService";

/* =======================
   🎨 สีตามโลโก้
======================= */
const COLOR_NEW = "#F36B21";      // ส้มเข้ม - รถใหม่
const COLOR_PRE_OWNED = "#9CA3AF"; // เทา - รถมือสอง

type DataItem = {
  name: string;
  value: number;
  color: string;
};

const VehicleTypeSales = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res: any = await getVehicleTypeTotalReport();

        if (res?.data) {
          const chartData: DataItem[] = [
            {
              name: "รถใหม่",
              value: res.data.new || 0,
              color: COLOR_NEW,
            },
            {
              name: "รถมือสอง",
              value: res.data.pre_owned || 0,
              color: COLOR_PRE_OWNED,
            },
          ];

          setData(chartData);
        }
      } catch (error) {
        console.error("❌ Error fetching vehicle type data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-64">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center w-full h-64">
        <p className="text-gray-500">ไม่มีข้อมูลยอดขาย</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h2 className="mb-4 text-xl font-semibold">
        รถใหม่ vs รถมือสอง
      </h2>

      <div className="flex flex-row items-center justify-center gap-10 w-full">
        {/* กราฟ Pie Chart */}
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
            <Tooltip
              formatter={(value: number) => [`${value} คัน`, ""]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        {/* แสดงสรุปตัวเลข */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded"
              style={{ backgroundColor: COLOR_NEW }}
            />
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">รถใหม่</span>
              <span className="text-2xl font-bold">{data[0]?.value || 0} คัน</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded"
              style={{ backgroundColor: COLOR_PRE_OWNED }}
            />
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">รถมือสอง</span>
              <span className="text-2xl font-bold">{data[1]?.value || 0} คัน</span>
            </div>
          </div>
          <div className="mt-2 pt-4 border-t">
            <span className="text-sm text-gray-600">รวมทั้งหมด</span>
            <div className="text-3xl font-bold text-orange-600">
              {(data[0]?.value || 0) + (data[1]?.value || 0)} คัน
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleTypeSales;