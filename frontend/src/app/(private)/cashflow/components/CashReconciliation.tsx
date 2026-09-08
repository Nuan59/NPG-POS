// CashReconciliation.tsx
// วางไฟล์นี้ใน: src/app/(private)/cashflow/components/CashReconciliation.tsx
"use client";

import { fmt } from "../util/cashflowUtil";

interface CashReconciliationProps {
  countedCash: string;
  setCountedCash: (value: string) => void;
  cashClosing: number;
}

// ✅ ตรวจนับเงินสดปลายวัน - เทียบยอดที่นับได้จริงในลิ้นชักกับยอดที่ระบบคำนวณจากรายรับ-รายจ่าย
// (คำนวณล้วนๆ ไม่มีการ override ยอดในระบบ กันพนักงานพิมพ์ยอดเข้าไปเปลี่ยนของจริงได้)
const CashReconciliation = ({ countedCash, setCountedCash, cashClosing }: CashReconciliationProps) => {
  const counted = countedCash !== "" ? Number(countedCash) || 0 : null;
  const diff = counted !== null ? counted - cashClosing : null;

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-5">
      <h3 className="text-base font-bold mb-3 text-gray-800">🧮 ตรวจนับเงินสดปลายวัน</h3>
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-gray-600 shrink-0">นับเงินสดในลิ้นชักได้จริง</label>
        <input
          type="number"
          value={countedCash}
          onChange={(e) => setCountedCash(e.target.value)}
          placeholder="กรอกยอดที่นับได้"
          className="w-40 text-right text-sm border rounded-md px-2 py-1.5 border-gray-300 outline-none focus:border-orange-400"
        />
        <span className="text-xs text-gray-400">บาท</span>

        {diff !== null && (
          diff === 0 ? (
            <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1">
              ✓ ตรงกับระบบพอดี
            </span>
          ) : (
            <span className="text-sm font-semibold text-rose-600 flex items-center gap-1">
              ⚠ {diff > 0 ? "เกินระบบ" : "ขาดจากระบบ"} {fmt(Math.abs(diff))} บาท
            </span>
          )
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        * ใช้ตรวจสอบเฉยๆ ไม่มีผลกับยอดในระบบ ยอดจริงคำนวณจากรายรับ-รายจ่ายเสมอ
      </p>
    </div>
  );
};

export default CashReconciliation;