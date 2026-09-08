// CashflowMonthDialog.tsx
// วางไฟล์นี้ใน: src/app/(private)/cashflow/components/CashflowMonthDialog.tsx
"use client";

import { X } from "lucide-react";
import { CashflowMonthData } from "@/services/CashflowService";
import { fmt } from "../util/cashflowUtil";

interface CashflowMonthDialogProps {
  isAdmin: boolean;
  date: string;
  monthData: CashflowMonthData | null;
  onClose: () => void;
}

const CashflowMonthDialog = ({ isAdmin, date, monthData, onClose }: CashflowMonthDialogProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">สรุปเดือน {monthData?.month || date.slice(0, 7)}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        {!isAdmin ? (
          <div className="text-center text-gray-400 py-8 text-sm">สรุปยอดดูได้เฉพาะผู้ดูแลระบบ</div>
        ) : !monthData ? (
          <div className="text-center text-gray-400 py-8">กำลังโหลด...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="text-xs text-emerald-600 mb-1">รวมสุทธิ (เงินสด)</div>
                <div className="text-lg font-bold text-emerald-700">
                  {fmt(monthData.cashTotals.income - monthData.cashTotals.sent - monthData.cashTotals.expense - monthData.cashTotals.change - monthData.cashTotals.deposit_return)} บาท
                </div>
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                <div className="text-xs text-sky-600 mb-1">รวมสุทธิ (โอน)</div>
                <div className="text-lg font-bold text-sky-700">
                  {fmt(monthData.transferTotals.income - monthData.transferTotals.sent - monthData.transferTotals.expense - monthData.transferTotals.change - monthData.transferTotals.deposit_return)} บาท
                </div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b">
                  <th className="text-left py-1">วันที่</th>
                  <th className="text-right py-1">คงเหลือเงินสด</th>
                  <th className="text-right py-1">คงเหลือโอน</th>
                </tr>
              </thead>
              <tbody>
                {monthData.days.map((d) => (
                  <tr key={d.date} className="border-b last:border-b-0">
                    <td className="py-1">{d.date}</td>
                    <td className="py-1 text-right">{fmt(d.cashClosing)}</td>
                    <td className="py-1 text-right">{fmt(d.transferClosing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

export default CashflowMonthDialog;