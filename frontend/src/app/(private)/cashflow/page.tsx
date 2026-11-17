"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { Wallet, ChevronLeft, ChevronRight, CalendarRange, FileSpreadsheet, FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getCashflowDay, saveCashflowDay, getCashflowMonth, CashflowMonthData, CashflowCountInfo } from "@/services/CashflowService";
import { UIRow, toUIRow, toApiRow, todayStr, shiftDate, netOf, DayCashflowData } from "./util/cashflowUtil";
import { exportDailyExcel, exportRangeExcel } from "./util/exportReport";

import CashflowSection from "./components/CashflowSection";
import CashflowSummaryCards from "./components/CashflowSummaryCards";
import CashReconciliation from "./components/CashReconciliation";
import CashflowSaveStatus from "./components/CashflowSaveStatus";
import CashflowMonthDialog from "./components/CashflowMonthDialog";
import { DailyReportPdf, RangeReportPdf } from "@/components/pdf/CashflowReportPdf";

import { pdf } from "@react-pdf/renderer";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <span className="text-xs text-gray-400">กำลังเตรียม PDF...</span> }
);

export default function CashflowPage() {
  const { data: session } = useSession();
  const userInfo = session?.user as { name?: string; username?: string; role?: string } | undefined;
  const currentUserName = userInfo?.name ?? userInfo?.username ?? "";
  const role = String(userInfo?.role ?? "").toLowerCase();
  const isAdmin = role === "adm" || role === "admin" || role === "administrator";
  // ✅ ผู้ตรวจสอบ (mon): เห็นทุกอย่างเหมือน adm (สรุปเดือน / Export / ผลนับเงิน) แต่เพิ่ม/แก้/ลบรายการไม่ได้
  const isMonitor = role === "mon";
  const isReviewer = isAdmin || isMonitor;

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

  // ✅ แก้บั๊ก auto-save วนไม่หยุด: เดิม effect จับ "มีการเปลี่ยนแปลง" จาก reference ของ
  // cashRows/transferRows ทั้งก้อน ซึ่งพอ save เสร็จแล้ว loadDay() โหลดข้อมูลใหม่จาก server
  // มันสร้าง array ก้อนใหม่ขึ้นมาเสมอ (แม้ข้อมูลเหมือนเดิม) ทำให้ effect เข้าใจผิดว่ามีการแก้ไข
  // แล้ว save วนไม่จบ ตอนนี้ auto-save จะทำงานเฉพาะตอนคนแก้ไขเองผ่าน updateCashRows/
  // updateTransferRows เท่านั้น การโหลดข้อมูลใหม่จาก server (loadDay) จะไม่ไปกระตุ้น auto-save อีก
  const [dirtyTick, setDirtyTick] = useState(0);
  const updateCashRows = (rows: UIRow[]) => { setCashRows(rows); setDirtyTick((t) => t + 1); };
  const updateTransferRows = (rows: UIRow[]) => { setTransferRows(rows); setDirtyTick((t) => t + 1); };

  // ✅ เก็บ id ของแถวที่ "สั่งลบจริง" (กดกากบาทลบ) แยกไว้ต่างหาก แทนที่จะให้ backend เดาจากสิ่งที่
  // หายไปจาก state ทั้งวัน - กันไม่ให้แถวที่อีกฝั่ง (คนละแท็บ/เครื่อง) เพิ่งเพิ่มมาโดนลบทิ้งไปด้วย
  const deletedCashIdsRef = useRef<number[]>([]);
  const deletedTransferIdsRef = useRef<number[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Export ช่วงวันที่ (รวมหลายวันในรายงานเดียว)
  const [rangeFrom, setRangeFrom] = useState(() => todayStr().slice(0, 7) + "-01");
  const [rangeTo, setRangeTo] = useState(todayStr());
  const [rangeLoading, setRangeLoading] = useState<"excel" | "pdf" | null>(null);
  const MAX_RANGE_DAYS = 62;

  const fetchRangeData = async (from: string, to: string): Promise<DayCashflowData[]> => {
    const days: DayCashflowData[] = [];
    let cursor = from;
    let count = 0;
    while (cursor <= to && count < MAX_RANGE_DAYS) {
      const data = await getCashflowDay(cursor);
      const cashRows = data?.cash.rows.length ? data.cash.rows.map((r) => toUIRow(r, "")) : [];
      const transferRows = data?.transfer.rows.length ? data.transfer.rows.map((r) => toUIRow(r, "")) : [];
      const cashOpening = data?.cash.opening || 0;
      const transferOpening = data?.transfer.opening || 0;
      days.push({
        date: cursor,
        cashRows, cashOpening, cashClosing: netOf(cashRows, cashOpening),
        transferRows, transferOpening, transferClosing: netOf(transferRows, transferOpening),
      });
      cursor = shiftDate(cursor, 1);
      count++;
    }
    return days;
  };

  const handleExportRangeExcel = async () => {
    if (rangeFrom > rangeTo) { toast.error("วันเริ่มต้องไม่เกินวันสิ้นสุด"); return; }
    setRangeLoading("excel");
    try {
      const days = await fetchRangeData(rangeFrom, rangeTo);
      exportRangeExcel(days);
    } catch {
      toast.error("โหลดข้อมูลช่วงวันที่ไม่สำเร็จ");
    } finally {
      setRangeLoading(null);
    }
  };

  const handleExportRangePdf = async () => {
    if (rangeFrom > rangeTo) { toast.error("วันเริ่มต้องไม่เกินวันสิ้นสุด"); return; }
    setRangeLoading("pdf");
    try {
      const days = await fetchRangeData(rangeFrom, rangeTo);
      const blob = await pdf(<RangeReportPdf fromDate={rangeFrom} toDate={rangeTo} days={days} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `รายรับรายจ่าย-${rangeFrom}_ถึง_${rangeTo}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("สร้าง PDF ไม่สำเร็จ");
    } finally {
      setRangeLoading(null);
    }
  };

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
    deletedCashIdsRef.current = [];
    deletedTransferIdsRef.current = [];
    setDirtyTick(0);
  }, [date, loadDay]);

  const handleSave = useCallback(async (silent = false) => {
    setSaving(true);
    const payload = {
      date,
      cashRows: cashRows.filter((r) => r.description || r.amount).map(toApiRow),
      transferRows: transferRows.filter((r) => r.description || r.amount).map(toApiRow),
      deletedCashIds: deletedCashIdsRef.current,
      deletedTransferIds: deletedTransferIdsRef.current,
      checkerName: currentUserName,
      checkerDate: date,
    };
    const result = await saveCashflowDay(payload);
    setSaving(false);
    if (result.status === "success") {
      setLastSavedAt(new Date());
      if (!silent) toast.success("บันทึกแล้ว");
      // ✅ ลบสำเร็จแล้ว ล้าง id ที่เคยสั่งลบทิ้งได้ ไม่งั้น save รอบถัดไปจะพยายามลบซ้ำ (ไม่ error แต่ไม่จำเป็น)
      deletedCashIdsRef.current = [];
      deletedTransferIdsRef.current = [];
      // ✅ โหลดข้อมูลใหม่จาก server หลังบันทึกสำเร็จ - สำคัญมาก เพราะแถวที่เพิ่งบันทึกจะได้ "id"
      // กลับมา ทำให้ระบบล็อกไม่ให้พนักงานทั่วไปแก้ไข/ลบแถวนั้นได้อีก (ไม่งั้น id จะไม่มีวันติดมา
      // แล้วพนักงานจะแก้แถวเดิมไปเรื่อยๆ ได้ไม่จบ)
      loadDay(date);
    } else {
      toast.error(result.error || "บันทึกไม่สำเร็จ");
    }
  }, [date, cashRows, transferRows, currentUserName, loadDay]);

  // ✅ ลบแถวแล้วบันทึกทันที (ไม่รอ debounce 1.2 วิ) เพราะถ้าผู้ใช้กดลบแล้วรีบสลับไปหน้าอื่นก่อน
  // ครบเวลา การ auto-save ที่ค้างจะถูกยกเลิกไปเฉยๆ (component unmount เคลียร์ timer ทิ้ง) ทำให้
  // การลบไม่ถูกบันทึกจริง พอกลับมาแถวจะโผล่กลับมาเหมือนเดิม (เหมือนลบไม่ติด)
  const deleteRowNow = async (row: UIRow, section: "cash" | "transfer") => {
    if (!row.id) return; // แถวที่ยังไม่เคยบันทึก - setRows ลบออกจากเครื่องพอแล้ว ไม่ต้องยิง API

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (section === "cash") deletedCashIdsRef.current.push(row.id);
    else deletedTransferIdsRef.current.push(row.id);

    const nextCashRows = section === "cash" ? cashRows.filter((r) => r.id !== row.id) : cashRows;
    const nextTransferRows = section === "transfer" ? transferRows.filter((r) => r.id !== row.id) : transferRows;

    setSaving(true);
    const payload = {
      date,
      cashRows: nextCashRows.filter((r) => r.description || r.amount).map(toApiRow),
      transferRows: nextTransferRows.filter((r) => r.description || r.amount).map(toApiRow),
      deletedCashIds: deletedCashIdsRef.current,
      deletedTransferIds: deletedTransferIdsRef.current,
      checkerName: currentUserName,
      checkerDate: date,
    };
    const result = await saveCashflowDay(payload);
    setSaving(false);
    if (result.status === "success") {
      setLastSavedAt(new Date());
      deletedCashIdsRef.current = [];
      deletedTransferIdsRef.current = [];
      loadDay(date);
    } else {
      toast.error(result.error || "ลบไม่สำเร็จ");
    }
  };

  // ✅ Auto-save - ทำงานให้ทุกคน (ไม่ใช่แค่ admin) เพราะพนักงานทั่วไปก็เพิ่มรายการเองได้แล้ว
  // หยุดพิมพ์ 1.2 วิ แล้วเซฟให้เอง
  useEffect(() => {
    if (loading) return;
    if (skipAutoSaveRef.current) {
      skipAutoSaveRef.current = false;
      return;
    }
    if (dirtyTick === 0) return; // ยังไม่มีการแก้ไขเองเลยตั้งแต่โหลดหน้า - ไม่ต้อง save

    const timer = setTimeout(() => {
      handleSave(true);
      debounceTimerRef.current = null;
    }, 1200);
    debounceTimerRef.current = timer;

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtyTick]);

  // ✅ พนักงานกด "ส่งเงิน" สำเร็จ - backend ลงแถว "ส่งเงิน" (วันนี้) ให้แล้ว
  // บันทึกแถวที่ยังค้างพิมพ์อยู่ก่อน (ถ้ามี) แล้วโหลดข้อมูลใหม่ / ถ้าดูวันอื่นอยู่ พาไปวันนี้
  const afterHandover = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      await handleSave(true);
    }
    if (date !== todayStr()) setDate(todayStr());
    else loadDay(date);
  };

  const openMonth = async () => {
    setMonthOpen(true);
    setMonthData(await getCashflowMonth(date.slice(0, 7)));
  };

  const cashClosing = netOf(cashRows, cashOpening);
  const transferClosing = netOf(transferRows, transferOpening);

  const isToday = date === todayStr();
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("th-TH", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const btnOutline =
    "text-sm border border-slate-200 bg-white text-[#1e2432] rounded-lg px-3 py-2 flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-11 w-11 shrink-0 rounded-xl bg-[#F26B1D] text-white grid place-items-center">
              <Wallet size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-[#7A7A7A]">บันทึกรายวัน แยกเงินสด / โอน</p>
              <h1 className="text-xl md:text-2xl font-bold text-[#1e2432]">รายรับ-รายจ่าย</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving ? (
              <span className="text-xs text-[#F26B1D] flex items-center gap-1"><Loader2 size={13} className="animate-spin" /> กำลังบันทึก</span>
            ) : lastSavedAt ? (
              <span className="text-xs text-emerald-600">✓ บันทึกแล้ว {lastSavedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
            ) : null}
            {isReviewer && (
              <button onClick={openMonth} className={btnOutline}>
                <CalendarRange size={16} /> สรุปเดือน
              </button>
            )}
          </div>
        </div>

        {/* ✅ แถบเลือกวัน + สรุปยอด (กล่องสีกรมท่าเหมือนหน้า NPG) */}
        <section className="rounded-2xl bg-[#1e2432] text-white p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button onClick={() => setDate(shiftDate(date, -1))} aria-label="วันก่อนหน้า" className="bg-white/10 hover:bg-white/20 p-2 rounded-lg"><ChevronLeft size={18} /></button>
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="bg-white/10 text-white rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[#F26B1D] [color-scheme:dark]"
              />
              <button onClick={() => setDate(shiftDate(date, 1))} aria-label="วันถัดไป" className="bg-white/10 hover:bg-white/20 p-2 rounded-lg"><ChevronRight size={18} /></button>
              {!isToday && (
                <button onClick={() => setDate(todayStr())} className="ml-1 text-xs font-semibold rounded-lg bg-[#F26B1D] hover:bg-[#d95c14] px-3 py-2">
                  วันนี้
                </button>
              )}
            </div>
            <p className="text-sm text-white/70">{dateLabel}</p>
          </div>
          <CashflowSummaryCards cashClosing={cashClosing} transferClosing={transferClosing} />
        </section>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-[#7A7A7A] py-16">
            <Loader2 size={18} className="animate-spin" /> กำลังโหลด...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <CashflowSection title="เงินสด" accent="emerald" rows={cashRows} setRows={updateCashRows}
                opening={cashOpening} currentUserName={currentUserName} isAdmin={isAdmin} readOnly={isMonitor}
                onRowDeleted={(row) => deleteRowNow(row, "cash")} onHandoverDone={afterHandover} />
              <CashflowSection title="โอน" accent="sky" rows={transferRows} setRows={updateTransferRows}
                opening={transferOpening} currentUserName={currentUserName} isAdmin={isAdmin} readOnly={isMonitor}
                onRowDeleted={(row) => deleteRowNow(row, "transfer")} />
            </div>

            {/* ✅ ตรวจนับเงินสด - พนักงานบันทึกได้เหมือนกัน แต่ตัวเลข/ประวัติหลังบันทึกเห็นได้เฉพาะ admin */}
            <CashReconciliation
              date={date}
              countedCash={countedCash}
              setCountedCash={setCountedCash}
              cashClosing={cashClosing}
              cashCount={cashCount}
              onRecorded={() => loadDay(date)}
              isAdmin={isReviewer}
              readOnly={isMonitor}
            />

            {/* ✅ Export (เฉพาะ adm / ผู้ตรวจสอบ) - รายวัน + ช่วงวันที่ */}
            {isReviewer && (
              <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                <h3 className="text-base font-bold text-[#1e2432] flex items-center gap-2">
                  <Download size={17} className="text-[#F26B1D]" /> Export รายงาน
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[#7A7A7A] w-full sm:w-auto sm:mr-2">วันที่เลือก</span>
                  <button
                    onClick={() =>
                      exportDailyExcel({
                        date, cashRows, cashOpening, cashClosing,
                        transferRows, transferOpening, transferClosing,
                      })
                    }
                    className={btnOutline}
                  >
                    <FileSpreadsheet size={15} /> Excel
                  </button>
                  <PDFDownloadLink
                    document={
                      <DailyReportPdf
                        date={date} cashRows={cashRows} cashOpening={cashOpening} cashClosing={cashClosing}
                        transferRows={transferRows} transferOpening={transferOpening} transferClosing={transferClosing}
                      />
                    }
                    fileName={`รายรับรายจ่าย-${date}.pdf`}
                  >
                    <button className={btnOutline}>
                      <FileText size={15} /> PDF
                    </button>
                  </PDFDownloadLink>
                </div>
                <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
                  <span className="text-sm text-[#7A7A7A] w-full">ช่วงวันที่ (สูงสุด {MAX_RANGE_DAYS} วัน)</span>
                  <div>
                    <label className="text-xs text-[#7A7A7A] block mb-1">จากวันที่</label>
                    <input
                      type="date"
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(e.target.value)}
                      className="border rounded-lg px-2 py-1.5 text-sm border-slate-200 outline-none focus:border-[#F26B1D]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#7A7A7A] block mb-1">ถึงวันที่</label>
                    <input
                      type="date"
                      value={rangeTo}
                      onChange={(e) => setRangeTo(e.target.value)}
                      className="border rounded-lg px-2 py-1.5 text-sm border-slate-200 outline-none focus:border-[#F26B1D]"
                    />
                  </div>
                  <button onClick={handleExportRangeExcel} disabled={!!rangeLoading} className={btnOutline}>
                    <FileSpreadsheet size={15} /> {rangeLoading === "excel" ? "กำลังโหลด..." : "Excel"}
                  </button>
                  <button onClick={handleExportRangePdf} disabled={!!rangeLoading} className={btnOutline}>
                    <FileText size={15} /> {rangeLoading === "pdf" ? "กำลังโหลด..." : "PDF"}
                  </button>
                </div>
              </section>
            )}

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