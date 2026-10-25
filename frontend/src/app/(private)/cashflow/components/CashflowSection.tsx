// CashflowSection.tsx
// วางไฟล์นี้ใน: src/app/(private)/cashflow/components/CashflowSection.tsx
"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import {
  ACCENT, RowType, TYPE_COLOR, TYPE_FIELDS, TYPE_LABEL, UIRow,
  blankUIRow, fmt, signedAmount,
} from "../util/cashflowUtil";
import AddCashflowRowDialog from "./AddCashflowRowDialog";

interface CashflowSectionProps {
  title: string;
  accent: "emerald" | "sky";
  rows: UIRow[];
  setRows: (rows: UIRow[]) => void;
  opening: number;
  currentUserName: string;
  isAdmin: boolean;
  onRowDeleted?: (row: UIRow) => void;
  /** ✅ ผู้ตรวจสอบ: ดูได้อย่างเดียว ไม่มีปุ่มเพิ่ม/แก้/ลบ */
  readOnly?: boolean;
  /** ✅ ส่วนเงินสด: พนักงานกด "ส่งเงิน" ได้ (ติ๊กจากรายการค้างส่ง) - ส่งแล้วให้หน้าหลักโหลดใหม่ */
  onHandoverDone?: () => void;
}

const CashflowSection = ({
  title, accent, rows, setRows, opening, currentUserName, isAdmin, onRowDeleted, readOnly = false, onHandoverDone,
}: CashflowSectionProps) => {
  const style = ACCENT[accent];
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  let running = opening;
  const totals: Record<RowType, number> = { income: 0, sent: 0, expense: 0, change: 0, depositReturn: 0, cashIn: 0 };

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
  const removeRow = (idx: number) => {
    // ✅ แถวส่งเงินรายรายการ: ลบ = ยกเลิกการส่งรายการนั้น (เงินกลับเข้าลิ้นชัก รายการกลับไปค้างส่ง)
    if ((rows[idx] as any).handover && !window.confirm("ยกเลิกการส่งรายการนี้?\nเงินกลับเข้าลิ้นชัก และรายการกลับไปเป็นค้างส่ง")) return;
    onRowDeleted?.(rows[idx]);
    setRows(rows.filter((_, i) => i !== idx));
  };

  // ✅ สิทธิ์แก้ไข/ลบ:
  // - admin: แก้ไข/ลบได้ทุกแถว ไม่ว่าจะบันทึกไปแล้วหรือยัง
  // - พนักงานทั่วไป: แก้ไข/ลบได้เฉพาะแถวที่ "ยังไม่บันทึก" (ไม่มี id) เท่านั้น
  //   พอ auto-save ไปแล้ว (ได้ id จาก server) จะแก้ไข/ลบไม่ได้อีกต่อไป
  // - แถว "อัตโนมัติ": ทุกคน (รวม admin) แก้/ลบในหน้านี้ไม่ได้ ต้องแก้ที่รายการต้นทาง (ขาย / งานซ่อม / NPG)
  // - แถว "ส่งเงิน" รายรายการ (ส่งจากรายการค้างส่ง): แก้ได้เฉพาะ adm - แก้ยอด (ไม่เกินยอดเต็ม) / ลบ = ยกเลิกการส่งรายการนั้น
  //   ชื่อรายการ / ประเภท แก้ไม่ได้
  const getPermission = (row: UIRow) => {
    if ((row as any).handover) {
      const adm = !readOnly && isAdmin;
      return { canEdit: false, canEditAmount: adm, canDelete: adm };
    }
    const editable = !readOnly && !(row as any).auto && (isAdmin || !row.id);
    return { canEdit: editable, canEditAmount: editable, canDelete: editable };
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-5">
      <h3 className={`text-lg font-bold mb-3 ${style.title}`}>{title}</h3>

      <div className="space-y-2">
        {computed.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-6 border border-dashed rounded-lg">
            {readOnly ? "ยังไม่มีรายการ" : <>ยังไม่มีรายการ กด &quot;เพิ่มรายการ&quot; ด้านล่างเพื่อเริ่มบันทึก</>}
          </div>
        )}
        {computed.map((row, idx) => {
          const { canEdit, canEditAmount, canDelete } = getPermission(row);
          const maxAmount = (row as any).handover ? Number((row as any).maxAmount) || 0 : 0;
          return (
            <div key={idx} className={`flex items-start gap-2 border rounded-lg p-2 ${canEdit || canEditAmount ? "hover:bg-gray-50" : "bg-gray-50/60"}`}>
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
                    {/* ✅ แก้เป็น "ส่งเงิน" เองได้เฉพาะ adm (พนักงานส่งผ่านปุ่มเพิ่มรายการ → ส่งเงิน) - แถวที่เป็นส่งเงินอยู่แล้วยังโชว์ชื่อได้ปกติ */}
                    {TYPE_FIELDS.filter((t) => isAdmin || t !== "sent" || row.type === "sent").map((t) => (
                      <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="w-28 text-right text-sm border rounded-md px-2 py-1 border-gray-200 outline-none focus:border-orange-400 disabled:text-gray-500"
                    value={row.amount || ""}
                    onChange={(e) => {
                      let v = Number(e.target.value);
                      if (maxAmount > 0 && v > maxAmount) v = maxAmount; // ส่งเงินรายรายการ: ไม่เกินยอดเต็ม
                      updateRow(idx, { amount: v });
                    }}
                    max={maxAmount > 0 ? maxAmount : undefined}
                    placeholder="จำนวนเงิน"
                    disabled={!canEditAmount}
                  />
                  <span className="text-xs text-gray-400">บาท</span>
                  {/* ✅ รายรับที่ระบบลงให้เองตอนรับเงิน (ขาย / ซ่อม / ค่างวด) */}
                  {(row as any).handover && (
                    <span
                      title={isAdmin ? `adm แก้ยอดได้ (ไม่เกิน ${fmt(maxAmount)}) / กด ✕ = ยกเลิกการส่งรายการนี้` : "ส่งแล้ว แก้ได้เฉพาะ adm"}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200"
                    >
                      ส่งจากรายการ{maxAmount > 0 && Number(row.amount) < maxAmount ? ` · เต็ม ${fmt(maxAmount)}` : ""}
                    </span>
                  )}
                  {(row as any).auto && !(row as any).handover && (
                    <span
                      title="ระบบลงให้เอง แก้หรือลบที่รายการต้นทาง (ขาย / งานซ่อม / NPG)"
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      อัตโนมัติ
                    </span>
                  )}
                  {row.createdBy && (
                    <span className="text-[11px] text-gray-400 ml-auto">โดย {row.createdBy}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 pt-1">
                {/* ✅ ทุกคนเห็นยอดคงเหลือได้เหมือนกันแล้ว (พนักงานเห็นเหมือน admin) */}
                <div className="text-[10px] text-gray-400">คงเหลือ</div>
                <div className="font-semibold text-orange-600 text-sm whitespace-nowrap">{fmt(row.balance)}</div>
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

      {/* ✅ แถวสรุป "รวมเงิน" - ทุกคนเห็นได้เหมือนกันแล้ว */}
      <div className="flex justify-between items-center border-t-2 mt-3 pt-2 px-1 text-sm font-bold text-gray-800">
        <span>รวมเงิน</span>
        <span className="flex gap-3 text-xs font-semibold flex-wrap justify-end">
          {TYPE_FIELDS.filter((t) => totals[t] > 0).map((t) => (
            <span key={t} className={TYPE_COLOR[t].split(" ")[0]}>{TYPE_LABEL[t]}: {fmt(totals[t])}</span>
          ))}
        </span>
        <span className="text-orange-600">{fmt(running)}</span>
      </div>

      {/* ✅ กดเพิ่มรายการแล้วขึ้น dialog ให้กรอกครบในทีเดียว: ชื่อรายการ / ประเภท / จำนวนเงิน
          ทุกคนเพิ่มได้ (แค่แก้ไข/ลบแถวที่บันทึกแล้วไม่ได้ ถ้าไม่ใช่ admin) */}
      {!readOnly && (
      <button
        onClick={() => setAddDialogOpen(true)}
        className={`mt-3 w-full border border-dashed rounded-lg py-2 text-sm flex items-center justify-center gap-1 ${style.addBtn}`}
      >
        <Plus size={14} /> เพิ่มรายการ
      </button>
      )}

      {addDialogOpen && (
        <AddCashflowRowDialog
          isAdmin={isAdmin}
          allowHandover={!!onHandoverDone}
          onHandoverDone={onHandoverDone}
          onClose={() => setAddDialogOpen(false)}
          onAdd={({ description, type, amount }) => {
            setRows([...rows, { ...blankUIRow(currentUserName), description, type, amount }]);
          }}
        />
      )}
    </div>
  );
};

export default CashflowSection;