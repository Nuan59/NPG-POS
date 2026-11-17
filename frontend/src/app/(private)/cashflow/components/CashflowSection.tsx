// CashflowSection.tsx
// วางไฟล์นี้ใน: src/app/(private)/cashflow/components/CashflowSection.tsx
"use client";

import { Banknote, Landmark, Plus, X } from "lucide-react";
import { useState } from "react";
import {
  RowType, TYPE_COLOR, TYPE_FIELDS, TYPE_LABEL, UIRow,
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
    // ✅ แถวอัตโนมัติที่ adm แก้ - ติดธงไว้ให้ backend รู้ว่าแถวนี้ "ตั้งใจแก้" (แถวอื่นไม่แตะ)
    const autoEdited = (next[idx] as any).auto && !(next[idx] as any).handover ? { autoEdited: true } : {};
    next[idx] = { ...next[idx], ...patch, ...autoEdited };
    setRows(next);
  };
  const removeRow = (idx: number) => {
    // ✅ แถวส่งเงินรายรายการ: ลบ = ยกเลิกการส่งรายการนั้น (เงินกลับเข้าลิ้นชัก รายการกลับไปค้างส่ง)
    if ((rows[idx] as any).handover && !window.confirm("ยกเลิกการส่งรายการนี้?\nเงินกลับเข้าลิ้นชัก และรายการกลับไปเป็นค้างส่ง")) return;
    if ((rows[idx] as any).auto && !(rows[idx] as any).handover &&
      !window.confirm("ลบรายรับอัตโนมัตินี้?\n(รายการต้นทาง เช่น ค่างวด NPG ยังอยู่เหมือนเดิม)")) return;
    onRowDeleted?.(rows[idx]);
    setRows(rows.filter((_, i) => i !== idx));
  };

  // ✅ สิทธิ์แก้ไข/ลบ:
  // - admin: แก้ไข/ลบได้ทุกแถว ไม่ว่าจะบันทึกไปแล้วหรือยัง
  // - พนักงานทั่วไป: แก้ไข/ลบได้เฉพาะแถวที่ "ยังไม่บันทึก" (ไม่มี id) เท่านั้น
  //   พอ auto-save ไปแล้ว (ได้ id จาก server) จะแก้ไข/ลบไม่ได้อีกต่อไป
  // - แถว "อัตโนมัติ": adm แก้/ลบได้ทุกแถว / พนักงานทั่วไปแก้ไม่ได้ ต้องแก้ที่รายการต้นทาง
  // - แถว "ส่งเงิน" รายรายการ (ส่งจากรายการค้างส่ง): แก้ได้เฉพาะ adm - แก้ยอด (ไม่เกินยอดเต็ม) / ลบ = ยกเลิกการส่งรายการนั้น
  //   ชื่อรายการ / ประเภท แก้ไม่ได้
  const getPermission = (row: UIRow) => {
    if ((row as any).handover) {
      const adm = !readOnly && isAdmin;
      return { canEdit: false, canEditAmount: adm, canDelete: adm };
    }
    if ((row as any).auto) {
      const adm = !readOnly && isAdmin;
      return { canEdit: adm, canEditAmount: adm, canDelete: adm };
    }
    const editable = !readOnly && (isAdmin || !row.id);
    return { canEdit: editable, canEditAmount: editable, canDelete: editable };
  };

  const Icon = accent === "emerald" ? Banknote : Landmark;
  const iconCls = accent === "emerald" ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600";

  return (
    <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* หัวการ์ด: ชื่อส่วน + ยอดยกมา */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`h-9 w-9 shrink-0 rounded-lg grid place-items-center ${iconCls}`}>
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#1e2432] leading-tight">{title}</h3>
            <p className="text-xs text-[#7A7A7A] tabular-nums">ยกมา {fmt(opening)} ฿ · {computed.length} รายการ</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-[#7A7A7A]">คงเหลือ</p>
          <p className="text-lg font-bold text-[#F26B1D] tabular-nums whitespace-nowrap">{fmt(running)} ฿</p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {computed.length === 0 && (
          <div className="text-center text-sm text-[#7A7A7A] py-10">
            {readOnly ? "ยังไม่มีรายการ" : <>ยังไม่มีรายการ กด &quot;เพิ่มรายการ&quot; ด้านล่างเพื่อเริ่มบันทึก</>}
          </div>
        )}
        {computed.map((row, idx) => {
          const { canEdit, canEditAmount, canDelete } = getPermission(row);
          const maxAmount = (row as any).handover ? Number((row as any).maxAmount) || 0 : 0;
          const isAuto = (row as any).auto && !(row as any).handover;
          const lockedNote = isAuto ? (row as any).autoLocked : null;
          const sign = signedAmount(row) >= 0 ? "+" : "−";
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 px-4 py-3 transition-colors ${canEdit || canEditAmount ? "hover:bg-slate-50" : "bg-slate-50/50"}`}
            >
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  className="w-full bg-transparent outline-none text-sm font-medium text-[#1e2432] rounded-md px-1 -mx-1 py-0.5 focus:bg-white focus:ring-2 focus:ring-[#F26B1D]/30 disabled:text-slate-600"
                  value={row.description}
                  onChange={(e) => updateRow(idx, { description: e.target.value })}
                  placeholder="รายการ เช่น ค่าน้ำมัน, ขายอะไหล่..."
                  disabled={!canEdit}
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={row.type}
                    onChange={(e) => updateRow(idx, { type: e.target.value as RowType })}
                    className={`text-xs font-semibold rounded-full border px-2.5 py-1 outline-none disabled:opacity-70 ${TYPE_COLOR[row.type]}`}
                    disabled={!canEdit}
                  >
                    {/* ✅ แก้เป็น "ส่งเงิน" เองได้เฉพาะ adm (พนักงานส่งผ่านปุ่มเพิ่มรายการ → ส่งเงิน) - แถวที่เป็นส่งเงินอยู่แล้วยังโชว์ชื่อได้ปกติ */}
                    {TYPE_FIELDS.filter((t) => isAdmin || t !== "sent" || row.type === "sent").map((t) => (
                      <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      className="w-32 text-right text-sm font-semibold tabular-nums border rounded-lg pl-2 pr-6 py-1 border-slate-200 bg-white outline-none focus:border-[#F26B1D] focus:ring-2 focus:ring-[#F26B1D]/20 disabled:bg-transparent disabled:border-transparent disabled:text-slate-700"
                      value={row.amount || ""}
                      onChange={(e) => {
                        let v = Number(e.target.value);
                        if (maxAmount > 0 && v > maxAmount) v = maxAmount; // ส่งเงินรายรายการ: ไม่เกินยอดเต็ม
                        updateRow(idx, { amount: v });
                      }}
                      max={maxAmount > 0 ? maxAmount : undefined}
                      placeholder="0"
                      disabled={!canEditAmount}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">฿</span>
                  </div>
                  {(row as any).handover && (
                    <span
                      title={isAdmin ? `adm แก้ยอดได้ (ไม่เกิน ${fmt(maxAmount)}) / กด ✕ = ยกเลิกการส่งรายการนี้` : "ส่งแล้ว แก้ได้เฉพาะ adm"}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-[#F26B1D] border border-orange-200"
                    >
                      ส่งจากรายการ{maxAmount > 0 && Number(row.amount) < maxAmount ? ` · เต็ม ${fmt(maxAmount)}` : ""}
                    </span>
                  )}
                  {/* ✅ รายรับที่ระบบลงให้เองตอนรับเงิน (ขาย / ซ่อม / ค่างวด) */}
                  {isAuto && (
                    <span
                      title={
                        isAdmin
                          ? "ระบบลงให้เอง - adm แก้/ลบในหน้านี้ได้ (ถ้าแก้ที่รายการต้นทางทีหลัง ยอดจะถูกแก้ตามต้นทาง)"
                          : "ระบบลงให้เอง แก้หรือลบที่รายการต้นทาง (ขาย / งานซ่อม / NPG) หรือให้ adm แก้"
                      }
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
                    >
                      อัตโนมัติ
                    </span>
                  )}
                  {lockedNote && isAdmin && (
                    <span
                      title="รายการนี้ส่งเงินไปแล้ว ถ้าแก้ยอดตรงนี้ อย่าลืมเช็กแถว ส่งเงิน ด้วย (แก้ค่าปรับ/ยอด NPG ที่หน้า NPG จะปรับยอดส่งให้เอง)"
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                    >
                      ส่งเงินแล้ว
                    </span>
                  )}
                  {row.createdBy && (
                    <span className="text-[11px] text-slate-400 ml-auto">โดย {row.createdBy}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 pt-0.5">
                <div className={`text-sm font-bold tabular-nums whitespace-nowrap ${sign === "+" ? "text-emerald-600" : "text-rose-600"}`}>
                  {Number(row.amount) ? `${sign}${fmt(row.amount)}` : "-"}
                </div>
                <div className="text-[11px] text-[#7A7A7A] tabular-nums whitespace-nowrap">คงเหลือ {fmt(row.balance)}</div>
              </div>
              {canDelete ? (
                <button
                  onClick={() => removeRow(idx)}
                  aria-label="ลบรายการ"
                  className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md p-1 -mr-1"
                >
                  <X size={16} />
                </button>
              ) : (
                <span className="w-[22px] shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* ✅ แถวสรุป "รวมเงิน" */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
        <span className="font-semibold text-[#1e2432]">รวม</span>
        <span className="flex gap-1.5 text-[11px] font-semibold flex-wrap justify-end">
          {TYPE_FIELDS.filter((t) => totals[t] > 0).map((t) => (
            <span key={t} className={`rounded-full border px-2 py-0.5 tabular-nums ${TYPE_COLOR[t]}`}>
              {TYPE_LABEL[t]} {fmt(totals[t])}
            </span>
          ))}
        </span>
      </div>

      {/* ✅ กดเพิ่มรายการแล้วขึ้น dialog ให้กรอกครบในทีเดียว: ชื่อรายการ / ประเภท / จำนวนเงิน */}
      {!readOnly && (
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => setAddDialogOpen(true)}
            className="w-full rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-[#7A7A7A] flex items-center justify-center gap-1 hover:border-[#F26B1D] hover:text-[#F26B1D] hover:bg-orange-50/40 transition-colors"
          >
            <Plus size={15} /> เพิ่มรายการ
          </button>
        </div>
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
    </section>
  );
};

export default CashflowSection;