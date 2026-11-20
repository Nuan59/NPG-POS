"use client";
// ✅ ทะเบียนใบเสร็จรับเงินชั่วคราว - ทุกใบที่ออก (งานซ่อม / น้ำมันเครื่อง / ภาษี+พรบ / ขายอะไหล่ / ค่างวด NPG / ค่าธรรมเนียม NPG)
// ใบเสร็จรับเงิน (ขายรถ) อยู่ที่หน้า รายการขาย → เอกสาร
// พนักงาน: เห็นใบที่ใช้งานอยู่ + พิมพ์ซ้ำได้ / adm, ผู้ตรวจสอบ: เห็นใบที่ยกเลิก + ยอดรวม
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, MoreHorizontal, Printer, Search, Bike as BikeIcon } from "lucide-react";

interface ReceiptRow {
  id: number;
  number: string;
  kind: "service" | "npg_payment" | "npg_fee";
  kind_label: string;
  ref_id: number;
  receipt_date: string | null;
  category: string;
  customer: string;
  description: string;
  amount: number;
  payment_method: string;
  created_by: string;
  link: string;
  bike_id: number | null;
  status: "active" | "cancelled";
  cancelled_at: string | null;
  cancelled_by?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_API_URL;
const PAGE_SIZE = 50;
const REVIEW_ROLES = ["adm", "admin", "administrator", "mon"];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
};
const fmtDate = (s: string | null) =>
  s ? new Date(s.length <= 10 ? `${s}T00:00:00` : s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "-";
const baht = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 2 });

const KIND_STYLE: Record<string, string> = {
  service: "bg-orange-50 text-orange-700",
  npg_payment: "bg-blue-50 text-blue-700",
  npg_fee: "bg-purple-50 text-purple-700",
};

export default function ReceiptRegister({ onBike }: { onBike: (bikeId: number) => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const reviewer = REVIEW_ROLES.includes(String((session as any)?.user?.role ?? "").toLowerCase());

  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(ymd(new Date()));
  const [kind, setKind] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [total, setTotal] = useState(0);
  const [amountSum, setAmountSum] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (from) params.set("date_from", from);
      if (to) params.set("date_to", to);
      if (kind) params.set("kind", kind);
      if (q) params.set("q", q);
      params.set("status", reviewer ? statusFilter : "active");
      const res = await fetch(`${baseUrl}/receipts/?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `โหลดไม่สำเร็จ (${res.status})`);
      setRows(d.results || []);
      setTotal(d.total || 0);
      setAmountSum(typeof d.amount_sum === "number" ? d.amount_sum : null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, from, to, kind, q, statusFilter, reviewer]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [from, to, kind, q, statusFilter]);

  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const inputCls = "rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#F26B1D]";
  const cols = reviewer ? 9 : 8;

  return (
    <div className="space-y-4">
      {/* ตัวกรอง */}
      <section className={`rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end ${reviewer ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        <form className="text-xs text-[#7A7A7A] space-y-1" onSubmit={(e) => { e.preventDefault(); setQ(qInput.trim()); }}>
          <span>ค้นหา (เลขที่ / ชื่อลูกค้า / รายการ)</span>
          <div className="relative">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={qInput} onChange={(e) => setQInput(e.target.value)} onBlur={() => setQ(qInput.trim())}
              placeholder="เช่น S-00000012, สมชาย" className={`${inputCls} w-full pl-8`} />
          </div>
        </form>
        <label className="text-xs text-[#7A7A7A] space-y-1">
          <span>จากวันที่</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} w-full`} />
        </label>
        <label className="text-xs text-[#7A7A7A] space-y-1">
          <span>ถึงวันที่</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} w-full`} />
        </label>
        <label className="text-xs text-[#7A7A7A] space-y-1">
          <span>ประเภท</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${inputCls} w-full`}>
            <option value="">ทั้งหมด</option>
            <option value="service">งานบริการ / ขายอะไหล่</option>
            <option value="npg_payment">ค่างวด NPG</option>
            <option value="npg_fee">ค่าธรรมเนียม NPG</option>
          </select>
        </label>
        {/* 🔒 ใบที่ยกเลิก เห็นเฉพาะ adm / ผู้ตรวจสอบ */}
        {reviewer && (
          <label className="text-xs text-[#7A7A7A] space-y-1">
            <span>สถานะ (เฉพาะ adm)</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} w-full`}>
              <option value="active">ใช้งานอยู่</option>
              <option value="cancelled">ยกเลิกแล้ว</option>
              <option value="all">ทั้งหมด</option>
            </select>
          </label>
        )}
      </section>

      {reviewer && amountSum !== null && (
        <p className="text-sm text-slate-600">
          {total.toLocaleString()} ใบ · ยอดรวม <span className="font-semibold text-[#1e2432] tabular-nums">{baht(amountSum)} ฿</span>
        </p>
      )}

      <div className="rounded-md bg-white">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              {["วันที่", "เลขที่", "ประเภท", "ลูกค้า", "รายการ", "ยอด (฿)", "ชำระโดย", "ผู้ออก", ...(reviewer ? ["สถานะ"] : [])].map((h) => (
                <TableHead key={h} className={`text-slate-900 font-bold ${h === "รายการ" ? "text-left" : h === "ยอด (฿)" ? "text-right" : "text-center"}`}>{h}</TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow><TableCell colSpan={cols + 1} className="h-24 text-center"><Loader2 className="mx-auto animate-spin text-slate-400" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={cols + 1} className="h-24 text-center text-slate-500">ไม่มีใบเสร็จในช่วงนี้</TableCell></TableRow>
            ) : (
              rows.map((r) => {
                const cancelled = r.status === "cancelled";
                return (
                  <TableRow
                    key={r.id}
                    onClick={() => !cancelled && router.push(r.link)}
                    className={`transition-colors ${cancelled ? "text-slate-400" : "cursor-pointer hover:bg-slate-100 text-slate-900"}`}
                  >
                    <TableCell className="text-center whitespace-nowrap tabular-nums">{fmtDate(r.receipt_date)}</TableCell>
                    <TableCell className={`text-center whitespace-nowrap font-mono font-semibold ${cancelled ? "line-through" : ""}`}>{r.number}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${KIND_STYLE[r.kind] || "bg-slate-100"}`}>{r.category || r.kind_label}</span>
                    </TableCell>
                    <TableCell className="text-center">{r.customer || "-"}</TableCell>
                    <TableCell className="text-left max-w-[360px]"><span className="line-clamp-2 break-words text-slate-700">{r.description || "-"}</span></TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{baht(r.amount)}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{r.payment_method || "-"}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">{r.created_by || "-"}</TableCell>
                    {reviewer && (
                      <TableCell className="text-center whitespace-nowrap">
                        {cancelled ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700" title={`${fmtDate(r.cancelled_at)} · ${r.cancelled_by || "-"}`}>
                            ยกเลิก · {r.cancelled_by || "-"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">ใช้งาน</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {!cancelled && (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" aria-label="เมนู"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(r.link)}>
                              <Printer className="mr-2 h-4 w-4" /> พิมพ์ใบเสร็จชั่วคราว
                            </DropdownMenuItem>
                            {r.bike_id && (
                              <DropdownMenuItem onClick={() => onBike(r.bike_id!)}>
                                <BikeIcon className="mr-2 h-4 w-4" /> ดูประวัติรถคันนี้
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
    </div>
  );
}
