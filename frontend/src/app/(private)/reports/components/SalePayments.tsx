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
import { getSalesPaymentMethodsReport } from "@/services/ReportsService";
import { generateNpgReadableColor, resetGeneratedColors } from "../util/colors";

type PaymentData = {
  payment_method: string;
  total_sales: number;
};

type ChartDataItem = {
  name: string;
  value: number;
  color: string;
};

const SalePayments = () => {
  const [data, setData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        resetGeneratedColors();
        
        const res: any = await getSalesPaymentMethodsReport();

        if (res?.data && Array.isArray(res.data)) {
          // จัดกลุ่มข้อมูลตาม payment method
          const groupedData: { [key: string]: number } = {
            "เงินสด": 0,
            "ไฟแนนซ์": 0,
            "ผ่อนกับร้าน": 0,
          };

          res.data.forEach((item: PaymentData) => {
            const method = (item.payment_method || "").toLowerCase().trim();
            const sales = item.total_sales || 0;

            // ✅ แก้ไข: เช็คเงื่อนไขตามลำดับความสำคัญ
            if (method.includes("npg") || method.includes("ผ่อนกับร้าน")) {
              // NPG หรือผ่อนกับร้าน (ทั้งรายเดือนและรายปี)
              groupedData["ผ่อนกับร้าน"] += sales;
            } else if (
              method.includes("cathay") || 
              method.includes("ทรัพย์สยาม") || 
              method.includes("ไฟแนนซ์") ||
              method === "finance"
            ) {
              // Cathay, ทรัพย์สยาม, หรือ "ไฟแนนซ์" ทั่วไป
              groupedData["ไฟแนนซ์"] += sales;
            } else {
              // เงินสด หรือค่าว่าง
              groupedData["เงินสด"] += sales;
            }
          });

          // แปลงเป็น ChartDataItem พร้อมสร้างสี
          const chartData: ChartDataItem[] = Object.entries(groupedData)
            .filter(([_, value]) => value > 0) // แสดงเฉพาะกลุ่มที่มียอดขาย
            .map(([name, value]) => ({
              name,
              value,
              color: generateNpgReadableColor(),
            }));

          setData(chartData);
        }
      } catch (error) {
        console.error("❌ Error fetching payment methods:", error);
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
        ยอดขายแยกตามวิธีชำระเงิน
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
            <Tooltip formatter={(value: number) => [`${value} คัน`, ""]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        {/* แสดงสรุปตัวเลข */}
        <div className="flex flex-col gap-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex flex-col">
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-2xl font-bold">{item.value} คัน</span>
              </div>
            </div>
          ))}
          <div className="mt-2 pt-4 border-t">
            <span className="text-sm text-gray-600">รวมทั้งหมด</span>
            <div className="text-3xl font-bold text-orange-600">
              {total} คัน
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalePayments;