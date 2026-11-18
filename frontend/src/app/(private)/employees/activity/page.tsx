"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
      return `${baseUrl}/activity-logs/?${params}`;
    },
    [userId, from, to, q, errorsOnly]
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
  useEffect(() => { setPage(1); }, [userId, from, to, q, errorsOnly]);

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/employees" aria-label="กลับ" className="rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50">
            <ArrowLeft size={18} />
          </Link>
          <span className="h-11 w-11 shrink-0 rounded-xl bg-[#F26B1D] text-white grid place-items-center"><History size={22} /></span>
          <div className="min-w-0">
            <p className="text-xs text-[#7A7A7A]">ใครทำอะไร เมื่อไหร่ · แก้หรือลบไม่ได้</p>
            <h1 className="text-xl md:text-2xl font-bold text-[#1e2432]">บันทึกการทำงาน</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm flex items-center gap-1.5 hover:bg-slate-50">
            <RefreshCw size={15} /> รีเฟรช
          </button>
          <button onClick={exportCsv} disabled={exporting || !total} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm flex items-center gap-1.5 hover:bg-slate-50 disabled:opacity-50">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Export
          </button>
        </div>
      </div>

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
        <label className="flex items-center gap-2 text-sm text-[#1e2432] py-2 cursor-pointer">
          <input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} className="h-4 w-4 accent-[#F26B1D]" />
          เฉพาะที่ไม่สำเร็จ
        </label>
      </section>

      {/* รายการ */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm">
          <span className="text-[#7A7A7A] tabular-nums">ทั้งหมด {total.toLocaleString()} รายการ</span>
          {loading && <Loader2 size={16} className="animate-spin text-[#F26B1D]" />}
        </div>

        {!loading && rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#7A7A7A]">ไม่มีบันทึกในช่วงนี้</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => {
              const ok = r.status < 400;
              const isOpen = open === r.id;
              return (
                <li key={r.id} className="px-4 py-3">
                  <button className="w-full text-left flex items-start gap-3" onClick={() => setOpen(isOpen ? null : r.id)}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-semibold text-[#1e2432]">{r.action}</span>
                        {!ok && <span className="rounded-full bg-red-50 border border-red-200 px-2 text-[11px] font-semibold text-red-700">ไม่สำเร็จ {r.status}</span>}
                      </div>
                      {r.detail && <p className="text-sm text-slate-700 break-words">{r.detail}</p>}
                      <p className="text-xs text-[#7A7A7A]">
                        <span className="font-medium text-[#1e2432]">{r.user_name || r.username || "ไม่ทราบ (ไม่ได้ล็อกอิน)"}</span>
                        {r.role ? ` · ${ROLE_LABEL[r.role] || r.role}` : ""} · {fmtTime(r.created_at)}
                      </p>
                    </div>
                    <ChevronDown size={16} className={`mt-1 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="mt-2 ml-5 rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1.5 break-all">
                      <p><span className="text-[#7A7A7A]">คำขอ:</span> {r.method} {r.path} · {r.duration_ms} ms</p>
                      <p><span className="text-[#7A7A7A]">IP:</span> {r.ip || "-"}</p>
                      {r.payload && <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-700">{r.payload}</pre>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft size={16} /> ก่อนหน้า
            </button>
            <span className="tabular-nums text-[#7A7A7A]">หน้า {page} / {pages}</span>
            <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-50 disabled:opacity-40">
              ถัดไป <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
