"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import EmployeeTabs from "../components/EmployeeTabs";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Download, History, Loader2, RefreshCw, Search } from "lucide-react";

interface LogRow {
  id: number;
  created_at: string | null;
  user_id: number | null;
  username: string;
  user_name: string;
  role: string;
  method: string;
  path: string;
  status: number;
  action: string;
  detail: string;
  payload: string;
  ip: string;
  duration_ms: number;
}
interface LogUser { id: number; username: string; name: string; count: number }

const baseUrl = process.env.NEXT_PUBLIC_API_URL;
const PAGE_SIZE = 50;

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "-";

const ROLE_LABEL: Record<string, string> = { adm: "adm", emp: "พนักงาน", mon: "ผู้ตรวจสอบ" };

/**
 * ✅ บันทึกการทำงานของพนักงาน (adm / ผู้ตรวจสอบ) - ใครทำอะไร เมื่อไหร่ สำเร็จไหม
 * อ่านอย่างเดียว ระบบไม่มีปุ่มแก้/ลบ (กันลบหลักฐาน)
 */
export default function ActivityLogPage() {
  const { data: session } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;

  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(todayStr());
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  // ✅ การเปิดหน้า (ดูอย่างเดียว) มีเยอะมาก - ซ่อนไว้ก่อน ติ๊กเพื่อดู
  const [showViews, setShowViews] = useState(false);
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<LogUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const query = useCallback(
    (p: number, size: number) => {
      const params = new URLSearchParams({ page: String(p), page_size: String(size) });
      if (userId) params.set("user_id", userId);
      if (from) params.set("date_from", from);
      if (to) params.set("date_to", to);
      if (q) params.set("q", q);
      if (errorsOnly) params.set("errors", "1");
      if (!showViews) params.set("views", "0");
      return `${baseUrl}/activity-logs/?${params}`;
    },
    [userId, from, to, q, errorsOnly, showViews]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(query(page, PAGE_SIZE), { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `โหลดไม่สำเร็จ (${res.status})`);
      setRows(d.results || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, query, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!token) return;
    fetch(`${baseUrl}/activity-logs/users/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setUsers)
      .catch(() => {});
  }, [token]);

  // เปลี่ยนตัวกรอง → กลับหน้า 1
  useEffect(() => { setPage(1); }, [userId, from, to, q, errorsOnly, showViews]);

  const exportCsv = async () => {
    if (!token || exporting) return;
    setExporting(true);
    try {
      const all: LogRow[] = [];
      for (let p = 1; p <= 20; p++) {
        const res = await fetch(query(p, 500), { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`โหลดไม่สำเร็จ (${res.status})`);
        const d = await res.json();
        all.push(...(d.results || []));
        if (all.length >= d.total || !d.results?.length) break;
      }
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const head = ["เวลา", "พนักงาน", "username", "ตำแหน่ง", "งาน", "รายละเอียด", "ผล", "ข้อมูลที่ส่ง", "IP"];
      const lines = all.map((r) =>
        [fmtTime(r.created_at), r.user_name || r.username, r.username, ROLE_LABEL[r.role] || r.role, r.action, r.detail,
          r.status < 400 ? "สำเร็จ" : `ไม่สำเร็จ ${r.status}`, r.payload, r.ip].map(esc).join(",")
      );
      const blob = new Blob(["﻿" + [head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `บันทึกการทำงาน-${from}_${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const inputCls = "rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#F26B1D]";

  const openRow = rows.find((r) => r.id === open) || null;

  return (
    <div className="space-y-4">
      {/* หัว (แบบเดียวกับหน้าอื่น) */}
      <div className="grid grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold prompt">บันทึกการทำงาน</h2>
          <h6 className="prompt">รวมทั้งหมด: {total.toLocaleString()}</h6>
        </div>
        <div className="flex items-start justify-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <Link href="/employees">
                <TooltipTrigger className="border rounded-sm shadow-sm p-1 hover:bg-slate-100"><ArrowLeft /></TooltipTrigger>
              </Link>
              <TooltipContent><p>กลับหน้าพนักงาน</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger onClick={load} className="border rounded-sm shadow-sm p-1 hover:bg-slate-100"><RefreshCw /></TooltipTrigger>
              <TooltipContent><p>รีเฟรช</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger onClick={exportCsv} disabled={exporting || !total} className="border rounded-sm shadow-sm p-1 hover:bg-slate-100 disabled:opacity-40">
                {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              </TooltipTrigger>
              <TooltipContent><p>Export (เปิดใน Excel)</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <EmployeeTabs active="activity" />

      {/* ตัวกรอง */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <label className="text-xs text-[#7A7A7A] space-y-1">
          <span>พนักงาน</span>
          <select value={userId} onChange={(e) => setUserId(e.target.value)} className={`${inputCls} w-full`}>
            <option value="">ทุกคน</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.count})</option>)}
          </select>
        </label>
        <label className="text-xs text-[#7A7A7A] space-y-1">
          <span>จากวันที่</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} w-full`} />
        </label>
        <label className="text-xs text-[#7A7A7A] space-y-1">
          <span>ถึงวันที่</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} w-full`} />
        </label>
        <form
          className="text-xs text-[#7A7A7A] space-y-1"
          onSubmit={(e) => { e.preventDefault(); setQ(qInput.trim()); }}
        >
          <span>ค้นหา (ชื่อลูกค้า / งาน / ยอด)</span>
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={qInput} onChange={(e) => setQInput(e.target.value)} onBlur={() => setQ(qInput.trim())}
              placeholder="เช่น ค่าปรับ, NPG #12" className={`${inputCls} w-full pl-8`} />
          </div>
        </form>
        <div className="space-y-1.5 py-1">
          <label className="flex items-center gap-2 text-sm text-[#1e2432] cursor-pointer">
            <input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} className="h-4 w-4 accent-[#F26B1D]" />
            เฉพาะที่ไม่สำเร็จ
          </label>
          <label className="flex items-center gap-2 text-sm text-[#1e2432] cursor-pointer">
            <input type="checkbox" checked={showViews} onChange={(e) => setShowViews(e.target.checked)} className="h-4 w-4 accent-[#F26B1D]" />
            รวมการเปิดหน้า
          </label>
        </div>
      </section>

      {/* รายการ - ตาราง (แบบเดียวกับหน้าอื่น) กดแถวเพื่อดูรายละเอียด */}
      <div className="rounded-md bg-white">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              {["เวลา", "พนักงาน", "ตำแหน่ง", "งาน", "รายละเอียด", "ผล"].map((h) => (
                <TableHead key={h} className={`text-slate-900 font-bold ${h === "รายละเอียด" ? "text-left" : "text-center"}`}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto animate-spin text-slate-400" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-slate-500">ไม่มีบันทึกในช่วงนี้</TableCell></TableRow>
            ) : (
              rows.map((r) => {
                const ok = r.status < 400;
                const isView = r.method === "VIEW";
                return (
                  <TableRow
                    key={r.id}
                    onClick={() => setOpen(r.id)}
                    className={`cursor-pointer hover:bg-slate-100 transition-colors ${isView ? "text-slate-500" : "text-slate-900 font-bold"}`}
                  >
                    <TableCell className="text-center whitespace-nowrap tabular-nums">{fmtTime(r.created_at)}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{r.user_name || r.username || "ไม่ทราบ"}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{r.role ? ROLE_LABEL[r.role] || r.role : "-"}</TableCell>
                    <TableCell className="text-center">{r.action}</TableCell>
                    <TableCell className="text-left font-normal text-slate-700 max-w-[420px]">
                      <span className="line-clamp-2 break-words">{r.detail || "-"}</span>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {isView ? (
                        <span className="text-xs text-slate-400">เปิดดู</span>
                      ) : ok ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">สำเร็จ</span>
                      ) : (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">ไม่สำเร็จ {r.status}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-5 py-4">
        <Button variant="ghost" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}><ChevronLeft /></Button>
        <span className="text-sm text-slate-500 tabular-nums">หน้า {page} / {pages}</span>
        <Button variant="ghost" size="sm" onClick={() => setPage(page + 1)} disabled={page >= pages}><ChevronRight /></Button>
      </div>

      {/* รายละเอียด 1 รายการ */}
      {openRow && (
        <Dialog open onOpenChange={(o) => !o && setOpen(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{openRow.action}</DialogTitle>
              <DialogDescription>
                {openRow.user_name || openRow.username || "ไม่ทราบ"} · {fmtTime(openRow.created_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              {openRow.detail && <p className="whitespace-pre-wrap break-words text-slate-800">{openRow.detail}</p>}
              <p className="text-xs text-slate-500 break-all">คำขอ: {openRow.method} {openRow.path} · {openRow.duration_ms} ms · IP {openRow.ip || "-"}</p>
              {openRow.payload && (
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] text-slate-700">{openRow.payload}</pre>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
