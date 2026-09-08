// CashflowSection.tsx
// วางไฟล์นี้ใน: src/app/(private)/cashflow/components/CashflowSection.tsx
"use client";

import { Plus, X } from "lucide-react";
import {
  ACCENT, RowType, TYPE_COLOR, TYPE_FIELDS, TYPE_LABEL, UIRow,
  blankUIRow, fmt, signedAmount,
} from "../util/cashflowUtil";

interface CashflowSectionProps {
  title: string;
  accent: "emerald" | "sky";
  rows: UIRow[];
  setRows: (rows: UIRow[]) => void;
  opening: number;
  currentUserName: string;
  isAdmin: boolean;
}

const CashflowSection = ({
  title, accent, rows, setRows, opening, currentUserName, isAdmin,
}: CashflowSectionProps) => {
  const style = ACCENT[accent];
  let running = opening;
  const totals: Record<RowType, number> = { income: 0, sent: 0, expense: 0, change: 0, depositReturn: 0 };

  const computed = rows.map((r) => {
    running += signedAmount(r);
    totals[r.type] += Number(r.amount) || 0;
    return { ...r, balance: running };
  });

  const updateRow = (idx: number, patch: Partial<UIRow>) => {
    const next = [...rows];
    next[idx] = { ...next[idx], ...patch };
    setRows(next);
  };
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  // ✅ สิทธิ์แก้ไข/ลบ - เฉพาะ admin เท่านั้น
  const getPermission = () => ({ canEdit: isAdmin, canDelete: isAdmin });

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-5">
      <h3 className={`text-lg font-bold mb-3 ${style.title}`}>{title}</h3>

      <div className="space-y-2">
        {computed.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-6 border border-dashed rounded-lg">
            ยังไม่มีรายการ กด &quot;เพิ่มรายการ&quot; ด้านล่างเพื่อเริ่มบันทึก
          </div>
        )}
        {computed.map((row, idx) => {
          const { canEdit, canDelete } = getPermission();
          return (
            <div key={idx} className={`flex items-start gap-2 border rounded-lg p-2 ${canEdit ? "hover:bg-gray-50" : "bg-gray-50/60"}`}>
              <div className="flex-1 min-w-0 space-y-1.5">
                <input
                  className="w-full bg-transparent outline-none text-sm font-medium border-b border-dashed border-gray-200 pb-1 disabled:text-gray-500"
                  value={row.description}
                  onChange={(e) => updateRow(idx, { description: e.target.value })}
                  placeholder="รายการ เช่น ค่าน้ำมัน, ขายอะไหล่..."
                  disabled={!canEdit}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={row.type}
                    onChange={(e) => updateRow(idx, { type: e.target.value as RowType })}
                    className={`text-xs font-semibold rounded-md border px-2 py-1 disabled:opacity-60 ${TYPE_COLOR[row.type]}`}
                    disabled={!canEdit}
                  >
                    {TYPE_FIELDS.map((t) => (
                      <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="w-28 text-right text-sm border rounded-md px-2 py-1 border-gray-200 outline-none focus:border-orange-400 disabled:text-gray-500"
                    value={row.amount || ""}
                    onChange={(e) => updateRow(idx, { amount: Number(e.target.value) })}
                    placeholder="จำนวนเงิน"
                    disabled={!canEdit}
                  />
                  <span className="text-xs text-gray-400">บาท</span>
                  {row.createdBy && (
                    <span className="text-[11px] text-gray-400 ml-auto">โดย {row.createdBy}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 pt-1">
                {/* ✅ ยอดคงเหลือ (running balance) เป็นข้อมูลอ่อนไหว - โชว์ให้เฉพาะ admin
                    พนักงานทั่วไปเห็นได้แค่รายการที่บันทึกไว้ ไม่เห็นว่ารวมแล้วเหลือเท่าไหร่ */}
                {isAdmin && (
                  <>
                    <div className="text-[10px] text-gray-400">คงเหลือ</div>
                    <div className="font-semibold text-orange-600 text-sm whitespace-nowrap">{fmt(row.balance)}</div>
                  </>
                )}
              </div>
              {canDelete && (
                <button onClick={() => removeRow(idx)} className="text-gray-300 hover:text-rose-500 mt-1">
                  <X size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ✅ แถวสรุป "รวมเงิน" เปิดเผยยอดรวมปัจจุบันในลิ้นชัก - โชว์ให้เฉพาะ admin เหมือนกัน */}
      {isAdmin && (
        <div className="flex justify-between items-center border-t-2 mt-3 pt-2 px-1 text-sm font-bold text-gray-800">
          <span>รวมเงิน</span>
          <span className="flex gap-3 text-xs font-semibold flex-wrap justify-end">
            {TYPE_FIELDS.filter((t) => totals[t] > 0).map((t) => (
              <span key={t} className={TYPE_COLOR[t].split(" ")[0]}>{TYPE_LABEL[t]}: {fmt(totals[t])}</span>
            ))}
          </span>
          <span className="text-orange-600">{fmt(running)}</span>
        </div>
      )}

      {/* ✅ ปุ่มเพิ่มรายการ - เฉพาะ admin */}
      {isAdmin && (
        <button onClick={() => setRows([...rows, blankUIRow(currentUserName)])}
          className={`mt-3 w-full border border-dashed rounded-lg py-2 text-sm flex items-center justify-center gap-1 ${style.addBtn}`}>
          <Plus size={14} /> เพิ่มรายการ
        </button>
      )}
    </div>
  );
};

export default CashflowSection;