// FinancialSummaryFlow.tsx
// วางไฟล์นี้ใน: src/app/(private)/reports/components/FinancialSummaryFlow.tsx
"use client";

import { TrendingUp, DollarSign, ShoppingCart, Gift } from "lucide-react";
import { OverviewData, fmt } from "../util/financialTypes";

interface FinancialSummaryFlowProps {
  overview: OverviewData;
}

const FinancialSummaryFlow = ({ overview }: FinancialSummaryFlowProps) => {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="text-lg font-bold mb-5 text-gray-700">📊 สรุปภาพรวม</h3>

      {/* Flow: รายได้ − ต้นทุนรถ − ต้นทุนของแถม = กำไรสุทธิ */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        <div className="flex flex-col items-center bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 min-w-[130px]">
          <DollarSign className="h-6 w-6 text-blue-600 mb-1" />
          <span className="text-xs text-blue-600 font-medium">รายได้</span>
          <span className="text-xl font-bold text-blue-900">{fmt(overview.total_revenue)}</span>
          <span className="text-xs text-blue-500">บาท</span>
          {overview.total_additional_fee_revenue > 0 && (
            <span className="text-[10px] text-blue-400 mt-0.5">
              (รวมรายได้เพิ่มเติม {fmt(overview.total_additional_fee_revenue)})
            </span>
          )}
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
          <p className="text-sm text-gray-500">รายได้เพิ่มเติม</p>
          <p className="text-2xl font-bold text-blue-600">{fmt(overview.total_additional_fee_revenue)}</p>
          <p className="text-xs text-gray-400">บาท (ค่าใช้จ่ายเพิ่มเติมที่เก็บจากลูกค้า)</p>
        </div>
      </div>
    </div>
  );
};

export default FinancialSummaryFlow;