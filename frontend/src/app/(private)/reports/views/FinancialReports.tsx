"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Gift,
  BarChart3,
} from "lucide-react";
import { getFinancialSummary, getFinancialByModel, getFinancialOverview } from "@/services/FinancialReportsService";
import { fillMissingMonths } from "@/util/reports/index";

type FinancialData = {
  year: string | number;
  month: string;
  revenue: number;
  cost: number;
  additional_fees: number;
  gross_profit: number;
  net_profit: number;
  order_count: number;
};

type ModelData = {
  model_name: string;
  revenue: number;
  cost: number;
  gross_profit: number;
  count: number;
};

type OverviewData = {
  total_revenue: number;
  total_cost: number;
  total_additional_fees: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  total_orders: number;
  average_profit_per_order: number;
};

const COLORS = ["#00C49F", "#FF8042", "#f97316"];

const FinancialReports = () => {
  const [monthlyData, setMonthlyData] = useState<FinancialData[]>([]);
  const [modelData, setModelData] = useState<ModelData[]>([]);
  const [overview, setOverview] = useState<OverviewData>({
    total_revenue: 0,
    total_cost: 0,
    total_additional_fees: 0,
    gross_profit: 0,
    net_profit: 0,
    profit_margin: 0,
    total_orders: 0,
    average_profit_per_order: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, modelRes, overviewRes] = await Promise.all([
          getFinancialSummary(),
          getFinancialByModel(),
          getFinancialOverview(),
        ]);
        const filledData = fillMissingMonths(summaryRes.data || []);
        setMonthlyData(filledData);
        setModelData(modelRes.data || []);
        setOverview(overviewRes.data || overview);
      } catch (error) {
        console.error("Error fetching financial data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData =
    selectedYear === "all"
      ? monthlyData
      : monthlyData.filter((d) => String(d.year) === selectedYear);

  const years = Array.from(new Set(monthlyData.map((d) => String(d.year)))).sort();

  const fmt = (num: number) =>
    new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {fmt(entry.value)} บาท
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4 mx-auto"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">รายงานการเงิน</h2>
          <p className="text-gray-600 mt-1">สรุปรายได้ ต้นทุน และกำไร</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">ปี:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">ทั้งหมด</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {parseInt(year) + 543}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== สูตรกำไร (แสดงแบบ flow) ===== */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-bold mb-5 text-gray-700">📊 สรุปภาพรวม</h3>

        {/* Flow: รายได้ − ต้นทุนรถ − ต้นทุนของแถม = กำไรสุทธิ */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <div className="flex flex-col items-center bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 min-w-[130px]">
            <DollarSign className="h-6 w-6 text-blue-600 mb-1" />
            <span className="text-xs text-blue-600 font-medium">รายได้</span>
            <span className="text-xl font-bold text-blue-900">{fmt(overview.total_revenue)}</span>
            <span className="text-xs text-blue-500">บาท</span>
          </div>

          <span className="text-2xl font-bold text-gray-400">−</span>

          <div className="flex flex-col items-center bg-red-50 border border-red-200 rounded-xl px-5 py-4 min-w-[130px]">
            <ShoppingCart className="h-6 w-6 text-red-600 mb-1" />
            <span className="text-xs text-red-600 font-medium">ต้นทุนรถ</span>
            <span className="text-xl font-bold text-red-900">{fmt(overview.total_cost)}</span>
            <span className="text-xs text-red-500">บาท</span>
          </div>

          <span className="text-2xl font-bold text-gray-400">−</span>

          <div className="flex flex-col items-center bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 min-w-[130px]">
            <Gift className="h-6 w-6 text-orange-600 mb-1" />
            <span className="text-xs text-orange-600 font-medium">ต้นทุนของแถม</span>
            <span className="text-xl font-bold text-orange-900">{fmt(overview.total_additional_fees)}</span>
            <span className="text-xs text-orange-500">บาท</span>
          </div>

          <span className="text-2xl font-bold text-gray-400">=</span>

          <div className={`flex flex-col items-center rounded-xl px-5 py-4 min-w-[130px] border ${
            overview.net_profit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          }`}>
            <TrendingUp className={`h-6 w-6 mb-1 ${overview.net_profit >= 0 ? "text-green-600" : "text-red-600"}`} />
            <span className={`text-xs font-medium ${overview.net_profit >= 0 ? "text-green-600" : "text-red-600"}`}>
              กำไรสุทธิ
            </span>
            <span className={`text-xl font-bold ${overview.net_profit >= 0 ? "text-green-900" : "text-red-900"}`}>
              {fmt(overview.net_profit)}
            </span>
            <span className={`text-xs ${overview.net_profit >= 0 ? "text-green-500" : "text-red-500"}`}>
              บาท ({overview.profit_margin.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* สถิติเพิ่มเติม */}
        <div className="grid grid-cols-3 gap-4 border-t pt-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">จำนวนออเดอร์</p>
            <p className="text-2xl font-bold">{overview.total_orders}</p>
            <p className="text-xs text-gray-400">คำสั่งซื้อ</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">กำไรเฉลี่ย/ออเดอร์</p>
            <p className="text-2xl font-bold text-green-600">{fmt(overview.average_profit_per_order)}</p>
            <p className="text-xs text-gray-400">บาท</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Profit Margin</p>
            <p className="text-2xl font-bold text-blue-600">{overview.profit_margin.toFixed(1)}%</p>
            <p className="text-xs text-gray-400">
              {overview.profit_margin > 20 ? "🎯 ดีมาก" : overview.profit_margin > 10 ? "✅ ดี" : "⚠️ ปรับปรุง"}
            </p>
          </div>
        </div>
      </div>

      {/* Pie + Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4">สัดส่วนต้นทุนและกำไร</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: "กำไรสุทธิ", value: Math.max(overview.net_profit, 0) },
                  { name: "ต้นทุนรถ", value: overview.total_cost },
                  { name: "ต้นทุนของแถม", value: overview.total_additional_fees },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) =>
                  overview.total_revenue > 0
                    ? `${entry.name}: ${((entry.value / overview.total_revenue) * 100).toFixed(1)}%`
                    : ""
                }
                outerRadius={100}
                dataKey="value"
              >
                {[0, 1, 2].map((index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${fmt(value)} บาท`, ""]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            แนวโน้มรายเดือน
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" style={{ fontSize: "10px" }} />
              <YAxis style={{ fontSize: "10px" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="รายได้" stroke="#0088FE" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cost" name="ต้นทุนรถ" stroke="#FF8042" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="additional_fees" name="ต้นทุนของแถม" stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="net_profit" name="กำไรสุทธิ" stroke="#00C49F" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar กำไรรายเดือน */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">กำไรแยกตามเดือน</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" style={{ fontSize: "10px" }} />
            <YAxis style={{ fontSize: "10px" }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="gross_profit" name="กำไรขั้นต้น (ก่อนหักของแถม)" fill="#8884d8" />
            <Bar dataKey="additional_fees" name="ต้นทุนของแถม" fill="#f97316" />
            <Bar dataKey="net_profit" name="กำไรสุทธิ" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ตารางรุ่นรถ */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">กำไรแยกตามรุ่นรถ</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">รุ่นรถ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">จำนวนขาย</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">รายได้</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">ต้นทุนรถ</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">กำไร</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {modelData.map((model, index) => {
                const margin =
                  model.revenue > 0
                    ? ((model.gross_profit / model.revenue) * 100).toFixed(1)
                    : "0.0";
                const profitColor = model.gross_profit > 0 ? "text-green-600" : "text-red-600";
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{model.model_name}</td>
                    <td className="px-4 py-3 text-sm text-right">{model.count}</td>
                    <td className="px-4 py-3 text-sm text-right">{fmt(model.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">{fmt(model.cost)}</td>
                    <td className={`px-4 py-3 text-sm text-right font-semibold ${profitColor}`}>
                      {fmt(model.gross_profit)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right ${profitColor}`}>{margin}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-100 font-semibold">
              <tr>
                <td className="px-4 py-3 text-sm">รวม</td>
                <td className="px-4 py-3 text-sm text-right">
                  {modelData.reduce((sum, m) => sum + m.count, 0)}
                </td>
                <td className="px-4 py-3 text-sm text-right">
                  {fmt(modelData.reduce((sum, m) => sum + m.revenue, 0))}
                </td>
                <td className="px-4 py-3 text-sm text-right text-red-600">
                  {fmt(modelData.reduce((sum, m) => sum + m.cost, 0))}
                </td>
                <td className="px-4 py-3 text-sm text-right text-green-600">
                  {fmt(modelData.reduce((sum, m) => sum + m.gross_profit, 0))}
                </td>
                <td className="px-4 py-3 text-sm text-right">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};

export default FinancialReports;