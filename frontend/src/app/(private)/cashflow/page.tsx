"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, X, Plus, ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { toast } from "sonner";

import {
  getCashflowDay,
  saveCashflowDay,
  getCashflowMonth,
  CashflowMonthData,
  CashflowRow,
} from "@/services/CashflowService";

const blankRow = (createdBy: string): CashflowRow => ({
  description: "", income: 0, sent: 0, expense: 0, change: 0, depositReturn: 0, createdBy,
});

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmt = (n: number | undefined | null) =>
  (Number(n) || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });

const shiftDate = (dateStr: string, days: number) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const ACCENT = {
  emerald: { title: "text-emerald-700", box: "bg-emerald-50 border-emerald-200", addBtn: "border-emerald-300 text-emerald-600 hover:bg-emerald-50" },
  sky: { title: "text-sky-700", box: "bg-sky-50 border-sky-200", addBtn: "border-sky-300 text-sky-600 hover:bg-sky-50" },
} as const;

function netOf(rows: CashflowRow[], opening: number, override: string) {
  let running = override !== "" ? Number(override) || 0 : opening;
  rows.forEach((r) => {
    running += (Number(r.income) || 0) - (Number(r.sent) || 0) - (Number(r.expense) || 0) - (Number(r.change) || 0) - (Number(r.depositReturn) || 0);
  });
  return running;
}

function Section({
  title, accent, rows, setRows, opening, openingOverride, setOpeningOverride, currentUserName,
}: {
  title: string;
  accent: "emerald" | "sky";
  rows: CashflowRow[];
  setRows: (rows: CashflowRow[]) => void;
  opening: number;
  openingOverride: string;
  setOpeningOverride: (v: string) => void;
  currentUserName: string;
}) {
  const style = ACCENT[accent];
  let running = openingOverride !== "" ? Number(openingOverride) || 0 : opening;
  const totals = { income: 0, sent: 0, expense: 0, change: 0, depositReturn: 0 };

  const computed = rows.map((r) => {
    const income = Number(r.income) || 0;
    const sent = Number(r.sent) || 0;
    const expense = Number(r.expense) || 0;
    const change = Number(r.change) || 0;
    const depositReturn = Number(r.depositReturn) || 0;
    running = running + income - sent - expense - change - depositReturn;
    totals.income += income; totals.sent += sent; totals.expense += expense;
    totals.change += change; totals.depositReturn += depositReturn;
    return { ...r, balance: running };
  });

  const updateRow = (idx: number, field: keyof CashflowRow, value: string) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [field]: field === "description" ? value : Number(value) };
    setRows(next);
  };
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-5">
      <h3 className={`text-lg font-bold mb-3 ${style.title}`}>{title}</h3>

      <div className={`flex items-center justify-between border rounded-lg px-3 py-2 mb-3 text-sm ${style.box}`}>
        <span className="text-gray-600">ยอดยกมา</span>
        <Input
          type="number"
          value={openingOverride}
          onChange={(e) => setOpeningOverride(e.target.value)}
          placeholder={fmt(opening) + " (ยอดปิดเมื่อวาน)"}
          className="w-36 text-right h-8 text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="text-left py-1.5 px-1 font-semibold">รายการ</th>
              <th className="text-right py-1.5 px-1 font-semibold text-emerald-600">รายรับ</th>
              <th className="text-right py-1.5 px-1 font-semibold">ส่งเงิน</th>
              <th className="text-right py-1.5 px-1 font-semibold text-rose-600">รายจ่าย</th>
              <th className="text-right py-1.5 px-1 font-semibold text-sky-600">ทอนเงิน</th>
              <th className="text-right py-1.5 px-1 font-semibold">คืนมัดจำ</th>
              <th className="text-right py-1.5 px-1 font-semibold">คงเหลือ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {computed.map((row, idx) => (
              <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50 align-top">
                <td className="py-1 px-1">
                  <input className="w-full bg-transparent outline-none" value={row.description}
                    onChange={(e) => updateRow(idx, "description", e.target.value)} placeholder="รายการ..." />
                  {row.createdBy && (
                    <div className="text-[10px] text-gray-400 mt-0.5">โดย {row.createdBy}</div>
                  )}
                </td>
                {(["income", "sent", "expense", "change", "depositReturn"] as const).map((f) => (
                  <td key={f} className="py-1 px-1">
                    <input type="number" className="w-full bg-transparent outline-none text-right"
                      value={row[f] || ""} onChange={(e) => updateRow(idx, f, e.target.value)} placeholder="0" />
                  </td>
                ))}
                <td className="py-1 px-1 text-right font-semibold text-orange-600 whitespace-nowrap">{fmt(row.balance)}</td>
                <td className="py-1 px-1 text-center">
                  <button onClick={() => removeRow(idx)} className="text-gray-300 hover:text-rose-500"><X size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-bold text-gray-800">
              <td className="py-1.5 px-1">รวมเงิน</td>
              <td className="py-1.5 px-1 text-right">{fmt(totals.income)}</td>
              <td className="py-1.5 px-1 text-right">{fmt(totals.sent)}</td>
              <td className="py-1.5 px-1 text-right">{fmt(totals.expense)}</td>
              <td className="py-1.5 px-1 text-right">{fmt(totals.change)}</td>
              <td className="py-1.5 px-1 text-right">{fmt(totals.depositReturn)}</td>
              <td className="py-1.5 px-1 text-right text-orange-600">{fmt(running)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button onClick={() => setRows([...rows, blankRow(currentUserName)])}
        className={`mt-3 w-full border border-dashed rounded-lg py-2 text-sm flex items-center justify-center gap-1 ${style.addBtn}`}>
        <Plus size={14} /> เพิ่มรายการ
      </button>
    </div>
  );
}

export default function CashflowPage() {
  const { data: session } = useSession();
  const userInfo = session?.user as { name?: string; username?: string } | undefined;
  const currentUserName = userInfo?.name ?? userInfo?.username ?? "";

  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cashRows, setCashRows] = useState<CashflowRow[]>([]);
  const [transferRows, setTransferRows] = useState<CashflowRow[]>([]);
  const [cashOpening, setCashOpening] = useState(0);
  const [transferOpening, setTransferOpening] = useState(0);
  const [cashOpeningOverride, setCashOpeningOverride] = useState("");
  const [transferOpeningOverride, setTransferOpeningOverride] = useState("");
  const [checkerName, setCheckerName] = useState("");

  const [monthOpen, setMonthOpen] = useState(false);
  const [monthData, setMonthData] = useState<CashflowMonthData | null>(null);

  const loadDay = useCallback(async (d: string) => {
    setLoading(true);
    const data = await getCashflowDay(d);
    if (data) {
      setCashRows(data.cash.rows.length ? data.cash.rows : [blankRow(currentUserName)]);
      setTransferRows(data.transfer.rows.length ? data.transfer.rows : [blankRow(currentUserName)]);
      setCashOpening(data.cash.opening);
      setTransferOpening(data.transfer.opening);
      setCashOpeningOverride(data.cash.openingOverride != null ? String(data.cash.openingOverride) : "");
      setTransferOpeningOverride(data.transfer.openingOverride != null ? String(data.transfer.openingOverride) : "");
      setCheckerName(data.checkerName || "");
    } else {
      setCashRows([blankRow(currentUserName)]); setTransferRows([blankRow(currentUserName)]);
      setCashOpening(0); setTransferOpening(0);
      setCashOpeningOverride(""); setTransferOpeningOverride(""); setCheckerName("");
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserName]);

  useEffect(() => { loadDay(date); }, [date, loadDay]);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      date,
      cashRows: cashRows.filter((r) => r.description || r.income || r.sent || r.expense || r.change || r.depositReturn),
      transferRows: transferRows.filter((r) => r.description || r.income || r.sent || r.expense || r.change || r.depositReturn),
      cashOpeningOverride, transferOpeningOverride, checkerName, checkerDate: date,
    };
    const result = await saveCashflowDay(payload);
    setSaving(false);
    if (result.status === "success") { toast.success("บันทึกแล้ว"); loadDay(date); }
    else toast.error("บันทึกไม่สำเร็จ");
  };

  const openMonth = async () => {
    setMonthOpen(true);
    setMonthData(await getCashflowMonth(date.slice(0, 7)));
  };

  const cashClosing = netOf(cashRows, cashOpening, cashOpeningOverride);
  const transferClosing = netOf(transferRows, transferOpening, transferOpeningOverride);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-5">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-xl p-5 sm:p-6 text-white flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl"><Wallet size={28} /></div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black">รายรับ-รายจ่าย</h1>
              <p className="text-sm text-white/80">บันทึกรายวัน แยกเงินสด / โอน</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDate(shiftDate(date, -1))} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg"><ChevronLeft size={18} /></button>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white/90 text-gray-800 rounded-lg px-3 py-2 text-sm font-medium" />
            <button onClick={() => setDate(shiftDate(date, 1))} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg"><ChevronRight size={18} /></button>
            <button onClick={openMonth} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg flex items-center gap-1 text-sm px-3">
              <CalendarRange size={16} /> สรุปเดือน
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-10">กำลังโหลด...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Section title="💵 เงินสด" accent="emerald" rows={cashRows} setRows={setCashRows}
                opening={cashOpening} openingOverride={cashOpeningOverride} setOpeningOverride={setCashOpeningOverride}
                currentUserName={currentUserName} />
              <Section title="🏦 โอน" accent="sky" rows={transferRows} setRows={setTransferRows}
                opening={transferOpening} openingOverride={transferOpeningOverride} setOpeningOverride={setTransferOpeningOverride}
                currentUserName={currentUserName} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="text-xs text-orange-600 font-medium mb-1">สรุปยอดรวมทั้งหมด (เงินสด+โอน)</div>
                <div className="text-2xl font-bold text-orange-700">{fmt(cashClosing + transferClosing)} บาท</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="text-xs text-emerald-600 font-medium mb-1">ยอดคงเหลือเงินสด</div>
                <div className="text-2xl font-bold text-emerald-700">{fmt(cashClosing)} บาท</div>
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                <div className="text-xs text-sky-600 font-medium mb-1">ยอดคงเหลือโอน</div>
                <div className="text-2xl font-bold text-sky-700">{fmt(transferClosing)} บาท</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">ผู้เช็คเงิน:</span>
                <Input value={checkerName} onChange={(e) => setCheckerName(e.target.value)} placeholder="ชื่อผู้เช็คเงิน" className="w-48 h-9" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white px-6">
                {saving ? "กำลังบันทึก..." : "💾 บันทึกวันนี้"}
              </Button>
            </div>
          </>
        )}

        {monthOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMonthOpen(false)}>
            <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">สรุปเดือน {monthData?.month || date.slice(0, 7)}</h3>
                <button onClick={() => setMonthOpen(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
              </div>
              {!monthData ? (
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
        )}
      </div>
    </div>
  );
}
