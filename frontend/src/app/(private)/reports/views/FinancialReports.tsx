"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getFinancialSummary,
  getFinancialByModel,
  getFinancialOverview,
} from "@/services/FinancialReportsService";
import { IOrder } from "@/types/Order";
import { fillMissingMonths, MONTHS } from "../util/index";
import {
  FinancialData,
  ModelData,
  OverviewData,
  FeeBreakdownItem,
} from "../util/financialTypes";

import FinancialFilters from "../components/FinancialFilters";
import FinancialSummaryFlow from "../components/FinancialSummaryFlow";
import FinancialCostProfitPie from "../components/FinancialCostProfitPie";
import FinancialMonthlyTrendChart from "../components/FinancialMonthlyTrendChart";
import FinancialMonthlyProfitBarChart from "../components/FinancialMonthlyProfitBarChart";
import FinancialModelTable from "../components/FinancialModelTable";
import FinancialFeeBreakdownTable from "../components/FinancialFeeBreakdownTable";

interface FinancialReportsProps {
  // ✅ orders ดึงมาจาก server component (page.tsx) แล้วส่งเข้ามาเป็น prop
  // ไม่เรียก getOrders() เองใน useEffect เพราะ Server Action มี response size limit
  // order 500+ รายการพร้อมข้อมูลซ้อน (bikes, additional_fees, gifts) ใหญ่เกินจนล้มเหลวเงียบๆ
  orders?: IOrder[];
}

const FinancialReports = ({ orders = [] }: FinancialReportsProps) => {
  const [monthlyData, setMonthlyData] = useState<FinancialData[]>([]);
  const [modelData, setModelData] = useState<ModelData[]>([]);
  const [overview, setOverview] = useState<OverviewData>({
    total_revenue: 0,
    total_additional_fee_revenue: 0,
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
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  // ✅ เก็บ error จริงจาก API ไว้โชว์บนหน้าจอ แทนที่จะเงียบแล้วขึ้น 0 โดยไม่รู้สาเหตุ
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryRes, overviewRes] = await Promise.all([
          getFinancialSummary(),
          getFinancialOverview(),
        ]);
        const filledData = fillMissingMonths(summaryRes.data || []);
        setMonthlyData(filledData);
        setOverview(overviewRes.data || overview);

        const errors = [summaryRes.error, overviewRes.error].filter(
          (e): e is string => Boolean(e)
        );
        setApiErrors(Array.from(new Set(errors)));
      } catch (error) {
        console.error("Error fetching financial data:", error);
        setApiErrors([error instanceof Error ? error.message : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ"]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ✅ ตารางแยกตามรุ่นรถ ต้องดึงข้อมูลใหม่ทุกครั้งที่เปลี่ยนปี/เดือนที่เลือก
  useEffect(() => {
    const fetchModelData = async () => {
      try {
        const modelRes = await getFinancialByModel(
          selectedYear !== "all" ? selectedYear : undefined,
          selectedMonth !== "all" ? selectedMonth : undefined
        );
        setModelData(modelRes.data || []);
        if (modelRes.error) {
          setApiErrors((prev) => Array.from(new Set([...prev, modelRes.error as string])));
        }
      } catch (error) {
        console.error("Error fetching model data:", error);
      }
    };
    fetchModelData();
  }, [selectedYear, selectedMonth]);

  // ✅ แยกย่อยค่าใช้จ่ายเพิ่มเติมตามรายการ (description) คำนวณสดจาก orders ที่รับมาเป็น prop
  // กรองตามปี/เดือนที่เลือกด้วย logic เดียวกับ filteredData ด้านล่าง
  const feeBreakdown: FeeBreakdownItem[] = useMemo(() => {
    const result = new Map<string, FeeBreakdownItem>();

    for (const order of orders) {
      if (!order.sale_date) continue;
      const d = new Date(order.sale_date);
      const orderYear = String(d.getFullYear());
      const orderMonth = MONTHS[d.getMonth()];

      if (selectedYear !== "all" && orderYear !== selectedYear) continue;
      if (selectedMonth !== "all" && orderMonth !== selectedMonth) continue;

      for (const fee of order.additional_fees || []) {
        const label = (fee.description || "ไม่ระบุรายการ").trim() || "ไม่ระบุรายการ";
        const amount = Number(fee.amount || 0);
        const existing = result.get(label);
        if (existing) {
          existing.total_amount += amount;
          existing.count += 1;
        } else {
          result.set(label, { description: label, total_amount: amount, count: 1 });
        }
      }
    }

    return Array.from(result.values()).sort((a, b) => b.total_amount - a.total_amount);
  }, [orders, selectedYear, selectedMonth]);

  const filteredData = monthlyData.filter((d) => {
    const matchesYear = selectedYear === "all" || String(d.year) === selectedYear;
    const matchesMonth = selectedMonth === "all" || d.month === selectedMonth;
    return matchesYear && matchesMonth;
  });

  const years = Array.from(new Set(monthlyData.map((d) => String(d.year)))).sort();

  // ✅ คำนวณสรุปภาพรวมสดจากข้อมูลที่กรองแล้ว (ตามปี/เดือนที่เลือก)
  // แทนการใช้ overview จาก API ที่เป็นยอดรวมทั้งหมดคงที่ ไม่ตอบสนองตัวกรอง
  const computedOverview: OverviewData = filteredData.reduce(
    (acc, d) => {
      acc.total_revenue += d.revenue || 0;
      acc.total_additional_fee_revenue += d.additional_fee_revenue || 0;
      acc.total_cost += d.cost || 0;
      acc.total_additional_fees += d.additional_fees || 0;
      acc.total_orders += d.order_count || 0;
      return acc;
    },
    {
      total_revenue: 0,
      total_additional_fee_revenue: 0,
      total_cost: 0,
      total_additional_fees: 0,
      gross_profit: 0,
      net_profit: 0,
      profit_margin: 0,
      total_orders: 0,
      average_profit_per_order: 0,
    }
  );
  computedOverview.gross_profit = computedOverview.total_revenue - computedOverview.total_cost;
  computedOverview.net_profit = computedOverview.gross_profit - computedOverview.total_additional_fees;
  computedOverview.profit_margin =
    computedOverview.total_revenue > 0
      ? (computedOverview.net_profit / computedOverview.total_revenue) * 100
      : 0;
  computedOverview.average_profit_per_order =
    computedOverview.total_orders > 0
      ? computedOverview.net_profit / computedOverview.total_orders
      : 0;

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
      {/* ✅ Error banner - โชว์ error จริงจาก API ถ้ามี ไม่ต้องเปิด Vercel logs เอง */}
      {apiErrors.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="font-bold text-red-800 mb-1">⚠️ ดึงข้อมูลการเงินไม่สำเร็จ:</p>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-0.5">
            {apiErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <FinancialFilters
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        years={years}
        onYearChange={setSelectedYear}
        onMonthChange={setSelectedMonth}
      />

      <FinancialSummaryFlow overview={computedOverview} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinancialCostProfitPie overview={computedOverview} />
        <FinancialMonthlyTrendChart data={filteredData} />
      </div>

      <FinancialMonthlyProfitBarChart data={filteredData} />

      <FinancialModelTable modelData={modelData} />

      <FinancialFeeBreakdownTable feeBreakdown={feeBreakdown} />
    </div>
  );
};

export default FinancialReports;