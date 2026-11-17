// CashflowSummaryCards.tsx
// วางไฟล์นี้ใน: src/app/(private)/cashflow/components/CashflowSummaryCards.tsx
"use client";

import { fmt } from "../util/cashflowUtil";

interface CashflowSummaryCardsProps {
  cashClosing: number;
  transferClosing: number;
}

// ✅ อยู่ในกล่องสีกรมท่าด้านบน (ธีมเดียวกับหน้า NPG)
const CashflowSummaryCards = ({ cashClosing, transferClosing }: CashflowSummaryCardsProps) => {
  const tiles = [
    { label: "ยอดรวม (เงินสด + โอน)", value: cashClosing + transferClosing, note: "เงินสดคงเหลือ + โอนวันนี้", cls: "text-[#F26B1D]" },
    { label: "เงินสดคงเหลือ", value: cashClosing, note: "ยกไปวันถัดไปให้อัตโนมัติ", cls: "text-emerald-300" },
    { label: "ยอดโอนวันนี้", value: transferClosing, note: "ไม่ยกยอด วันใหม่เริ่มที่ 0", cls: "text-sky-300" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl bg-white/[0.07] px-4 py-3">
          <p className="text-xs text-white/65">{t.label}</p>
          <p className={`text-2xl font-bold ${t.cls}`}>{fmt(t.value)} ฿</p>
          <p className="text-[11px] text-white/50 mt-0.5">{t.note}</p>
        </div>
      ))}
    </div>
  );
};

export default CashflowSummaryCards;
