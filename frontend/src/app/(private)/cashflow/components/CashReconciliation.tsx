// CashReconciliation.tsx
// วางไฟล์นี้ใน: src/app/(private)/cashflow/components/CashReconciliation.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CashflowCountInfo, recordCashCount } from "@/services/CashflowService";
import { fmt } from "../util/cashflowUtil";

interface CashReconciliationProps {
  date: string;
  countedCash: string;
  setCountedCash: (value: string) => void;
  cashClosing: number;
  cashCount: CashflowCountInfo | null | undefined;
  onRecorded: () => void;
}

const CashReconciliation = ({
  date, countedCash, setCountedCash, cashClosing, cashCount, onRecorded,
}: CashReconciliationProps) => {
  const [recording, setRecording] = useState(false);

  const counted = countedCash !== "" ? Number(countedCash) || 0 : null;
  const diff = counted !== null ? counted - cashClosing : null;

  const handleRecord = async () => {
    if (counted === null) {
      toast.error("กรุณากรอกยอดที่นับได้ก่อน");
      return;
    }
    setRecording(true);
    const result = await recordCashCount(date, counted);
    setRecording(false);
    if (result.status === "success") {
      toast.success("บันทึกรายการนับเงินแล้ว");
      onRecorded();
    } else {
      toast.error(result.error || "บันทึกไม่สำเร็จ");
    }
  };

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

        <button
          onClick={handleRecord}
          disabled={recording || counted === null}
          className="ml-auto bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-1.5 rounded-lg"
        >
          {recording ? "กำลังบันทึก..." : "บันทึกรายการนับเงิน"}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        * ใช้ตรวจสอบและเก็บเป็นประวัติ ไม่มีผลกับยอดในระบบ ยอดจริงคำนวณจากรายรับ-รายจ่ายเสมอ
      </p>

      {cashCount?.countedAmount != null && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-3 flex-wrap">
          <span>
            บันทึกล่าสุด: นับได้ <span className="font-semibold text-gray-700">{fmt(cashCount.countedAmount)}</span> บาท
          </span>
          {cashCount.countedBy && <span>โดย {cashCount.countedBy}</span>}
          {cashCount.countedAt && (
            <span>
              เมื่อ {new Date(cashCount.countedAt).toLocaleString("th-TH", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              })}
            </span>
          )}
          {cashCount.diff !== null && cashCount.diff !== undefined && (
            <span className={cashCount.diff === 0 ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
              {cashCount.diff === 0 ? "ตรงกับระบบ" : `ต่างจากระบบ ${fmt(Math.abs(cashCount.diff))} บาท`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CashReconciliation;