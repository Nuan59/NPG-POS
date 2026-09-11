"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { Wallet, ChevronLeft, ChevronRight, CalendarRange, FileSpreadsheet, FileText } from "lucide-react";
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

  // ✅ เก็บ id ของแถวที่ "สั่งลบจริง" (กดกากบาทลบ) แยกไว้ต่างหาก แทนที่จะให้ backend เดาจากสิ่งที่
  // หายไปจาก state ทั้งวัน - กันไม่ให้แถวที่อีกฝั่ง (คนละแท็บ/เครื่อง) เพิ่งเพิ่มมาโดนลบทิ้งไปด้วย
  const deletedCashIdsRef = useRef<number[]>([]);
  const deletedTransferIdsRef = useRef<number[]>([]);

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

        {/* ✅ Export ช่วงวันที่ - เลือกจาก-ถึง รวมหลายวันในรายงานเดียว */}
        <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap items-end gap-3">
          <div className="text-sm font-semibold text-gray-700 w-full sm:w-auto">
            📅 Export รายงานช่วงวันที่
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">จากวันที่</label>
            <input
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm border-gray-300 outline-none focus:border-orange-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">ถึงวันที่</label>
            <input
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm border-gray-300 outline-none focus:border-orange-400"
            />
          </div>
          <button
            onClick={handleExportRangeExcel}
            disabled={!!rangeLoading}
            className="text-sm border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50"
          >
            <FileSpreadsheet size={15} /> {rangeLoading === "excel" ? "กำลังโหลด..." : "Export Excel"}
          </button>
          <button
            onClick={handleExportRangePdf}
            disabled={!!rangeLoading}
            className="text-sm border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50"
          >
            <FileText size={15} /> {rangeLoading === "pdf" ? "กำลังโหลด..." : "Export PDF"}
          </button>
          <span className="text-xs text-gray-400 w-full">
            เลือกได้สูงสุด {MAX_RANGE_DAYS} วันต่อรายงาน
          </span>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-10">กำลังโหลด...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <CashflowSection title="💵 เงินสด" accent="emerald" rows={cashRows} setRows={setCashRows}
                opening={cashOpening} currentUserName={currentUserName} isAdmin={isAdmin}
                onRowDeleted={(row) => { if (row.id) deletedCashIdsRef.current.push(row.id); }} />
              <CashflowSection title="🏦 โอน" accent="sky" rows={transferRows} setRows={setTransferRows}
                opening={transferOpening} currentUserName={currentUserName} isAdmin={isAdmin}
                onRowDeleted={(row) => { if (row.id) deletedTransferIdsRef.current.push(row.id); }} />
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

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() =>
                  exportDailyExcel({
                    date, cashRows, cashOpening, cashClosing,
                    transferRows, transferOpening, transferClosing,
                  })
                }
                className="text-sm border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-gray-50"
              >
                <FileSpreadsheet size={15} /> Export Excel
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
                <button className="text-sm border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 flex items-center gap-1.5 hover:bg-gray-50">
                  <FileText size={15} /> Export PDF
                </button>
              </PDFDownloadLink>
            </div>

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