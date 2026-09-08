"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Wallet, ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { toast } from "sonner";

import { getCashflowDay, saveCashflowDay, getCashflowMonth, CashflowMonthData, CashflowCountInfo } from "@/services/CashflowService";
import { UIRow, toUIRow, toApiRow, todayStr, shiftDate, netOf } from "./util/cashflowUtil";

import CashflowSection from "./components/CashflowSection";
import CashflowSummaryCards from "./components/CashflowSummaryCards";
import CashReconciliation from "./components/CashReconciliation";
import CashflowSaveStatus from "./components/CashflowSaveStatus";
import CashflowMonthDialog from "./components/CashflowMonthDialog";

export default function CashflowPage() {
  const { data: session } = useSession();
  const userInfo = session?.user as { name?: string; username?: string; role?: string } | undefined;
  const currentUserName = userInfo?.name ?? userInfo?.username ?? "";
  const isAdmin = userInfo?.role === "adm";

  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [cashRows, setCashRows] = useState<UIRow[]>([]);
  const [transferRows, setTransferRows] = useState<UIRow[]>([]);
  const [cashOpening, setCashOpening] = useState(0);
  const [transferOpening, setTransferOpening] = useState(0);

  const [monthOpen, setMonthOpen] = useState(false);
  const [monthData, setMonthData] = useState<CashflowMonthData | null>(null);

  // ✅ ตรวจนับเงินสดปลายวัน - ค่าที่กำลังกรอก + ประวัติล่าสุดที่เคยบันทึกไว้ (มาจาก server)
  const [countedCash, setCountedCash] = useState<string>("");
  const [cashCount, setCashCount] = useState<CashflowCountInfo | null>(null);

  // ✅ ใช้กันไม่ให้ auto-save effect ทำงานตอนเพิ่งโหลดข้อมูลเข้ามาใหม่จาก server
  const skipAutoSaveRef = useRef(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const loadDay = useCallback(async (d: string) => {
    setLoading(true);
    skipAutoSaveRef.current = true;
    const data = await getCashflowDay(d);
    if (data) {
      setCashRows(data.cash.rows.length ? data.cash.rows.map((r) => toUIRow(r, currentUserName)) : []);
      setTransferRows(data.transfer.rows.length ? data.transfer.rows.map((r) => toUIRow(r, currentUserName)) : []);
      setCashOpening(data.cash.opening);
      setTransferOpening(data.transfer.opening);
      setCashCount(data.cashCount || null);
    } else {
      setCashRows([]); setTransferRows([]);
      setCashOpening(0); setTransferOpening(0);
      setCashCount(null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserName]);

  useEffect(() => {
    loadDay(date);
    setCountedCash(""); // ✅ เปลี่ยนวันแล้วล้างค่านับเงินเก่าทิ้ง กันเอายอดวันก่อนมาเทียบผิดวัน
  }, [date, loadDay]);

  const handleSave = useCallback(async (silent = false) => {
    setSaving(true);
    const payload = {
      date,
      cashRows: cashRows.filter((r) => r.description || r.amount).map(toApiRow),
      transferRows: transferRows.filter((r) => r.description || r.amount).map(toApiRow),
      checkerName: currentUserName,
      checkerDate: date,
    };
    const result = await saveCashflowDay(payload);
    setSaving(false);
    if (result.status === "success") {
      setLastSavedAt(new Date());
      if (!silent) toast.success("บันทึกแล้ว");
      // ✅ โหลดข้อมูลใหม่จาก server หลังบันทึกสำเร็จ - สำคัญมาก เพราะแถวที่เพิ่งบันทึกจะได้ "id"
      // กลับมา ทำให้ระบบล็อกไม่ให้พนักงานทั่วไปแก้ไข/ลบแถวนั้นได้อีก (ไม่งั้น id จะไม่มีวันติดมา
      // แล้วพนักงานจะแก้แถวเดิมไปเรื่อยๆ ได้ไม่จบ)
      loadDay(date);
    } else {
      toast.error(result.error || "บันทึกไม่สำเร็จ");
    }
  }, [date, cashRows, transferRows, currentUserName, loadDay]);

  // ✅ Auto-save - ทำงานให้ทุกคน (ไม่ใช่แค่ admin) เพราะพนักงานทั่วไปก็เพิ่มรายการเองได้แล้ว
  // หยุดพิมพ์ 1.2 วิ แล้วเซฟให้เอง
  useEffect(() => {
    if (loading) return;
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      handleSave(true);
    }, 1200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashRows, transferRows, cashOpening, transferOpening]);

  const openMonth = async () => {
    setMonthOpen(true);
    setMonthData(await getCashflowMonth(date.slice(0, 7)));
  };

  const cashClosing = netOf(cashRows, cashOpening);
  const transferClosing = netOf(transferRows, transferOpening);

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
            {isAdmin && (
              <button onClick={openMonth} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg flex items-center gap-1 text-sm px-3">
                <CalendarRange size={16} /> สรุปเดือน
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-10">กำลังโหลด...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <CashflowSection title="💵 เงินสด" accent="emerald" rows={cashRows} setRows={setCashRows}
                opening={cashOpening} currentUserName={currentUserName} isAdmin={isAdmin} />
              <CashflowSection title="🏦 โอน" accent="sky" rows={transferRows} setRows={setTransferRows}
                opening={transferOpening} currentUserName={currentUserName} isAdmin={isAdmin} />
            </div>

            {/* ✅ การ์ดสรุปยอด - โชว์ให้ทุกคนเห็นเหมือนกันแล้ว (พนักงานเห็นเหมือน admin) */}
            <CashflowSummaryCards cashClosing={cashClosing} transferClosing={transferClosing} />

            {/* ✅ ตรวจนับเงินสด - พนักงานบันทึกได้เหมือนกัน แต่ตัวเลข/ประวัติหลังบันทึกเห็นได้เฉพาะ admin
                (ส่ง isAdmin เข้าไปให้ component จัดการเงื่อนไขล็อก/ซ่อนเอง) */}
            <CashReconciliation
              date={date}
              countedCash={countedCash}
              setCountedCash={setCountedCash}
              cashClosing={cashClosing}
              cashCount={cashCount}
              onRecorded={() => loadDay(date)}
              isAdmin={isAdmin}
            />

            <CashflowSaveStatus
              currentUserName={currentUserName}
              isAdmin={isAdmin}
              saving={saving}
              lastSavedAt={lastSavedAt}
            />
          </>
        )}

        {monthOpen && (
          <CashflowMonthDialog
            isAdmin={isAdmin}
            date={date}
            monthData={monthData}
            onClose={() => setMonthOpen(false)}
          />
        )}
      </div>
    </div>
  );
}