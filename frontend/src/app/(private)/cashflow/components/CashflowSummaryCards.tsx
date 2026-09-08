// CashflowSummaryCards.tsx
// วางไฟล์นี้ใน: src/app/(private)/cashflow/components/CashflowSummaryCards.tsx
"use client";

import { fmt } from "../util/cashflowUtil";

interface CashflowSummaryCardsProps {
  cashClosing: number;
  transferClosing: number;
}

const CashflowSummaryCards = ({ cashClosing, transferClosing }: CashflowSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="text-xs text-orange-600 font-medium mb-1">สรุปยอดรวมทั้งหมด (เงินสด+โอน)</div>
        <div className="text-2xl font-bold text-orange-700">{fmt(cashClosing + transferClosing)} บาท</div>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="text-xs text-emerald-600 font-medium mb-1">ยอดคงเหลือเงินสด</div>
        <div className="text-2xl font-bold text-emerald-700">{fmt(cashClosing)} บาท</div>
        {/* ✅ อธิบายว่ายอดนี้ยกไปวันถัดไปให้อัตโนมัติ ไม่ต้องทำอะไรเพิ่ม */}
        <div className="text-[11px] text-emerald-600/70 mt-1">ยกยอดไปวันถัดไปให้อัตโนมัติ</div>
      </div>
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
        <div className="text-xs text-sky-600 font-medium mb-1">ยอดคงเหลือโอน</div>
        <div className="text-2xl font-bold text-sky-700">{fmt(transferClosing)} บาท</div>
        <div className="text-[11px] text-sky-600/70 mt-1">ยกยอดไปวันถัดไปให้อัตโนมัติ</div>
      </div>
    </div>
  );
};

export default CashflowSummaryCards;