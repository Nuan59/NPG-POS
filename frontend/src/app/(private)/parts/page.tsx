"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  AlertTriangle, ArrowDownToLine, History, Loader2, Package, Pencil, Plus, Search, SlidersHorizontal, Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Part {
  id: number;
  code: string;
  name: string;
  fits: string;
  unit: string;
  cost?: string;
  price: string;
  wholesale_price: string | null;
  qty: string;
  min_qty: string;
  location: string;
  notes: string;
  low: boolean;
}

interface Movement {
  id: number;
  kind: string;
  kind_label: string;
  qty: string;
  qty_after: string;
  unit_cost?: string;
  unit_price: string | null;
  ref_type: string;
  ref_id: number | null;
  supplier: string;
  bill_no: string;
  note: string;
  created_by: string;
  created_at: string;
}

const n = (v: unknown) => Number(v) || 0;
const fmt = (v: unknown) => n(v).toLocaleString("th-TH", { maximumFractionDigits: 2 });
const when = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[#F26B1D] focus:ring-2 focus:ring-[#F26B1D]/20";

const Field = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <label className="block space-y-1">
    <span className="text-sm font-semibold text-[#1e2432]">{label}</span>
    {children}
    {hint && <span className="block text-xs text-slate-500">{hint}</span>}
  </label>
);

/**
 * ✅ เมนูอะไหล่ - รายการอะไหล่ คงเหลือ รับเข้า ประวัติเข้า-ออก
 * - ขาย / ใช้ในงานซ่อม → ทำที่กล่องรายการสั่งซื้อ (แท็บ อะไหล่ / ซ่อม → ปุ่ม อะไหล่จากสต็อก)
 * - ราคาทุน มูลค่าสต็อก ปรับยอด ปิดอะไหล่ = เฉพาะ adm
 */
export default function PartsPage() {
  const { data: session } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const isAdmin = String((session as any)?.user?.role ?? "").toLowerCase() === "adm";
  const readOnly = String((session as any)?.user?.role ?? "").toLowerCase() === "mon";

  const [rows, setRows] = useState<Part[]>([]);
  const [summary, setSummary] = useState<{ count: number; low: number; stock_value?: number } | null>(null);
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Part | "new" | null>(null);
  const [receiving, setReceiving] = useState<Part | null>(null);
  const [adjusting, setAdjusting] = useState<Part | null>(null);
  const [history, setHistory] = useState<Part | null>(null);

  const call = useCallback(
    async (path: string, method = "GET", body?: object) => {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.detail || `ทำรายการไม่สำเร็จ (${res.status})`);
      return data;
    },
    [token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (lowOnly) params.set("low", "1");
      const [list, sum] = await Promise.all([call(`/parts/?${params}`), call("/parts/summary/")]);
      setRows(list);
      setSummary(sum);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, q, lowOnly, call]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const deactivate = async (p: Part) => {
    if (!window.confirm(`ปิดอะไหล่ "${p.name}"?\nจะไม่ขึ้นในรายการอีก แต่ประวัติยังอยู่`)) return;
    try {
      await call(`/parts/${p.id}/`, "DELETE");
      toast.success("ปิดอะไหล่แล้ว");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 font-medium text-slate-900">
      {/* หัว */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 rounded-xl bg-[#F26B1D] text-white grid place-items-center"><Package size={22} /></span>
          <div>
            <p className="text-xs text-slate-500">สต็อกอะไหล่ · ขายและใช้ในงานซ่อมได้</p>
            <h1 className="text-xl md:text-2xl font-bold text-[#1e2432]">อะไหล่</h1>
          </div>
        </div>
        {!readOnly && (
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-1.5 rounded-xl bg-[#F26B1D] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#d95c14]"
          >
            <Plus size={18} /> เพิ่มอะไหล่
          </button>
        )}
      </div>

      {/* สรุป */}
      <section className="grid grid-cols-2 gap-3 rounded-2xl bg-[#1e2432] p-4 text-white sm:grid-cols-3">
        <div className="rounded-xl bg-white/[0.07] px-4 py-3">
          <p className="text-xs text-white/65">อะไหล่ทั้งหมด</p>
          <p className="text-2xl font-bold">{summary ? summary.count.toLocaleString() : "-"} <span className="text-sm font-normal text-white/60">รายการ</span></p>
        </div>
        <button
          onClick={() => setLowOnly(!lowOnly)}
          className={`rounded-xl px-4 py-3 text-left transition ${lowOnly ? "bg-[#F26B1D]" : "bg-white/[0.07] hover:bg-white/[0.12]"}`}
        >
          <p className="text-xs text-white/75">ใกล้หมด {lowOnly ? "(กำลังกรอง)" : "(กดเพื่อดู)"}</p>
          <p className={`text-2xl font-bold ${!lowOnly && summary?.low ? "text-amber-300" : ""}`}>
            {summary ? summary.low.toLocaleString() : "-"} <span className="text-sm font-normal text-white/60">รายการ</span>
          </p>
        </button>
        {summary?.stock_value !== undefined && (
          <div className="col-span-2 rounded-xl bg-white/[0.07] px-4 py-3 sm:col-span-1">
            <p className="text-xs text-white/65">มูลค่าสต็อก (ราคาทุน)</p>
            <p className="text-2xl font-bold text-[#FF9A52]">฿{fmt(summary.stock_value)}</p>
          </div>
        )}
      </section>

      <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
        <b>ขายอะไหล่</b> หรือ <b>ใช้ในงานซ่อม</b>: ทำที่กล่องรายการสั่งซื้อทางขวา แท็บ <b>อะไหล่</b> หรือ <b>ซ่อม</b> → ปุ่ม <b>อะไหล่จากสต็อก</b> ระบบตัดสต็อกให้เอง
      </div>

      {/* ค้นหา */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ค้นหาชื่อ รหัส รุ่นรถ หรือที่เก็บ"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-[15px] outline-none focus:border-[#F26B1D]"
        />
      </div>

      {/* รายการ */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-14 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center text-slate-500">
            {q || lowOnly ? "ไม่พบอะไหล่ที่ค้นหา" : "ยังไม่มีอะไหล่ กด เพิ่มอะไหล่ เพื่อเริ่ม"}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#1e2432]">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {[p.code, p.fits && `ใช้กับ ${p.fits}`, p.location && `ที่เก็บ ${p.location}`].filter(Boolean).join(" · ") || "-"}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold tabular-nums ${p.low ? "text-red-600" : "text-[#1e2432]"}`}>
                    {fmt(p.qty)} <span className="text-xs font-normal text-slate-500">{p.unit}</span>
                  </p>
                  {p.low && <p className="flex items-center justify-end gap-1 text-[11px] font-semibold text-red-600"><AlertTriangle size={12} /> ใกล้หมด</p>}
                </div>
                <div className="w-28 text-right text-sm tabular-nums">
                  <p className="font-semibold text-orange-600">฿{fmt(p.price)}</p>
                  {p.cost !== undefined && <p className="text-xs text-slate-500">ทุน ฿{fmt(p.cost)}</p>}
                </div>
                <div className="flex w-full justify-end gap-1.5 sm:w-auto">
                  {!readOnly && (
                    <button onClick={() => setReceiving(p)} className="flex items-center gap-1 rounded-lg bg-[#1e2432] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2a3245]">
                      <ArrowDownToLine size={14} /> รับเข้า
                    </button>
                  )}
                  <button onClick={() => setHistory(p)} title="ประวัติเข้า-ออก" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><History size={16} /></button>
                  {!readOnly && <button onClick={() => setEditing(p)} title="แก้ไข" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><Pencil size={16} /></button>}
                  {isAdmin && <button onClick={() => setAdjusting(p)} title="ปรับยอด / ตรวจนับ" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><SlidersHorizontal size={16} /></button>}
                  {isAdmin && <button onClick={() => deactivate(p)} title="ปิดอะไหล่" className="rounded-lg border border-slate-200 p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && <PartForm part={editing === "new" ? null : editing} isAdmin={isAdmin} call={call} onClose={() => setEditing(null)} onSaved={load} />}
      {receiving && <ReceiveForm part={receiving} call={call} onClose={() => setReceiving(null)} onSaved={load} />}
      {adjusting && <AdjustForm part={adjusting} call={call} onClose={() => setAdjusting(null)} onSaved={load} />}
      {history && <HistoryDialog part={history} isAdmin={isAdmin} call={call} onClose={() => setHistory(null)} />}
    </div>
  );
}

type Call = (path: string, method?: string, body?: object) => Promise<any>;

const SaveButtons = ({ saving, onClose, onSave, label }: { saving: boolean; onClose: () => void; onSave: () => void; label: string }) => (
  <DialogFooter className="gap-2">
    <button onClick={onClose} disabled={saving} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">ยกเลิก</button>
    <button onClick={onSave} disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-[#F26B1D] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#d95c14] disabled:opacity-60">
      {saving && <Loader2 size={15} className="animate-spin" />} {label}
    </button>
  </DialogFooter>
);

function PartForm({ part, isAdmin, call, onClose, onSaved }: { part: Part | null; isAdmin: boolean; call: Call; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: part?.name ?? "", code: part?.code ?? "", fits: part?.fits ?? "", unit: part?.unit ?? "ชิ้น",
    price: part ? String(n(part.price)) : "", wholesale_price: part?.wholesale_price ? String(n(part.wholesale_price)) : "",
    min_qty: part ? String(n(part.min_qty)) : "2", location: part?.location ?? "", notes: part?.notes ?? "",
    start_qty: "", unit_cost: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!f.name.trim()) return toast.error("กรุณาใส่ชื่ออะไหล่");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: f.name.trim(), code: f.code.trim(), fits: f.fits.trim(), unit: f.unit.trim() || "ชิ้น",
        price: n(f.price), wholesale_price: f.wholesale_price ? n(f.wholesale_price) : null,
        min_qty: n(f.min_qty), location: f.location.trim(), notes: f.notes,
      };
      if (part) await call(`/parts/${part.id}/`, "PATCH", body);
      else await call("/parts/", "POST", { ...body, start_qty: n(f.start_qty), unit_cost: n(f.unit_cost) });
      toast.success(part ? "แก้ไขแล้ว" : "เพิ่มอะไหล่แล้ว");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{part ? "แก้ไขอะไหล่" : "เพิ่มอะไหล่"}</DialogTitle>
          <DialogDescription>{part ? part.name : "ใส่ข้อมูลอะไหล่ และจำนวนที่มีอยู่ตอนนี้"}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="ชื่ออะไหล่ *"><input value={f.name} onChange={set("name")} placeholder="เช่น ผ้าเบรกหน้า" className={inputCls} /></Field></div>
          <Field label="รหัส"><input value={f.code} onChange={set("code")} placeholder="ไม่มีก็ได้" className={inputCls} /></Field>
          <Field label="หน่วย"><input value={f.unit} onChange={set("unit")} placeholder="ชิ้น / ชุด / ลิตร" className={inputCls} /></Field>
          <div className="sm:col-span-2"><Field label="ใช้กับรุ่น"><input value={f.fits} onChange={set("fits")} placeholder="เช่น Wave 110i, Click 125" className={inputCls} /></Field></div>
          <Field label="ราคาขาย (฿)"><input value={f.price} onChange={set("price")} inputMode="decimal" className={inputCls} /></Field>
          <Field label="ราคาส่ง (฿)" hint="ไม่มีก็เว้นว่าง"><input value={f.wholesale_price} onChange={set("wholesale_price")} inputMode="decimal" className={inputCls} /></Field>
          <Field label="เตือนเมื่อเหลือไม่เกิน"><input value={f.min_qty} onChange={set("min_qty")} inputMode="decimal" className={inputCls} /></Field>
          <Field label="ที่เก็บ"><input value={f.location} onChange={set("location")} placeholder="เช่น ชั้น A2" className={inputCls} /></Field>
          {!part && (
            <>
              <Field label="มีอยู่ตอนนี้กี่ชิ้น" hint="ยังไม่มีของ ใส่ 0"><input value={f.start_qty} onChange={set("start_qty")} inputMode="decimal" className={inputCls} /></Field>
              {isAdmin && <Field label="ราคาทุนต่อชิ้น (฿)"><input value={f.unit_cost} onChange={set("unit_cost")} inputMode="decimal" className={inputCls} /></Field>}
            </>
          )}
        </div>
        {part && <p className="text-xs text-slate-500">จำนวนคงเหลือแก้ตรงนี้ไม่ได้ ใช้ปุ่ม รับเข้า หรือให้ adm ปรับยอด</p>}
        <SaveButtons saving={saving} onClose={onClose} onSave={save} label="บันทึก" />
      </DialogContent>
    </Dialog>
  );
}

function ReceiveForm({ part, call, onClose, onSaved }: { part: Part; call: Call; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ qty: "", unit_cost: part.cost ? String(n(part.cost)) : "", supplier: "", bill_no: "", note: "" });
  const [payCash, setPayCash] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const total = n(f.qty) * n(f.unit_cost);

  const save = async () => {
    if (n(f.qty) <= 0) return toast.error("กรุณาใส่จำนวนที่รับเข้า");
    setSaving(true);
    try {
      await call(`/parts/${part.id}/receive/`, "POST", { ...f, qty: n(f.qty), unit_cost: n(f.unit_cost), pay_cash: payCash });
      toast.success(`รับเข้า ${part.name} +${fmt(f.qty)} ${part.unit}${payCash ? " · ลงรายจ่ายเงินสดแล้ว" : ""}`);
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>รับอะไหล่เข้า</DialogTitle>
          <DialogDescription>{part.name} · ตอนนี้เหลือ {fmt(part.qty)} {part.unit}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`จำนวน (${part.unit}) *`}><input autoFocus value={f.qty} onChange={set("qty")} inputMode="decimal" className={inputCls} /></Field>
          <Field label="ราคาทุนต่อหน่วย (฿)"><input value={f.unit_cost} onChange={set("unit_cost")} inputMode="decimal" className={inputCls} /></Field>
          <Field label="ซื้อจากร้าน"><input value={f.supplier} onChange={set("supplier")} className={inputCls} /></Field>
          <Field label="เลขที่บิล"><input value={f.bill_no} onChange={set("bill_no")} className={inputCls} /></Field>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input type="checkbox" checked={payCash} onChange={(e) => setPayCash(e.target.checked)} className="mt-1 h-5 w-5 accent-[#F26B1D]" />
          <span className="text-sm">
            <b>จ่ายเงินสดจากลิ้นชัก</b> — ลงรายจ่ายในหน้ารายรับ-รายจ่ายวันนี้ให้เลย
            {total > 0 && <span className="block text-slate-500">ยอด ฿{fmt(total)}</span>}
          </span>
        </label>
        <SaveButtons saving={saving} onClose={onClose} onSave={save} label="รับเข้า" />
      </DialogContent>
    </Dialog>
  );
}

function AdjustForm({ part, call, onClose, onSaved }: { part: Part; call: Call; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState(String(n(part.qty)));
  const [reason, setReason] = useState("นับสต็อก");
  const [saving, setSaving] = useState(false);
  const diff = n(qty) - n(part.qty);

  const save = async () => {
    setSaving(true);
    try {
      await call(`/parts/${part.id}/adjust/`, "POST", { qty: n(qty), reason });
      toast.success("ปรับยอดแล้ว");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ปรับยอด / ตรวจนับ</DialogTitle>
          <DialogDescription>{part.name} · ในระบบมี {fmt(part.qty)} {part.unit}</DialogDescription>
        </DialogHeader>
        <Field label={`นับได้จริง (${part.unit})`}><input autoFocus value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" className={inputCls} /></Field>
        <Field label="เหตุผล *"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="นับสต็อก / ของเสีย / ของหาย" className={inputCls} /></Field>
        {diff !== 0 && (
          <p className={`text-sm font-semibold ${diff < 0 ? "text-red-600" : "text-emerald-600"}`}>
            {diff > 0 ? "เพิ่ม" : "ลด"} {fmt(Math.abs(diff))} {part.unit}
          </p>
        )}
        <SaveButtons saving={saving} onClose={onClose} onSave={save} label="ปรับยอด" />
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ part, isAdmin, call, onClose }: { part: Part; isAdmin: boolean; call: Call; onClose: () => void }) {
  const [rows, setRows] = useState<Movement[] | null>(null);
  useEffect(() => {
    call(`/parts/${part.id}/movements/`).then(setRows).catch((e) => { toast.error(e.message); setRows([]); });
  }, [part.id, call]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ประวัติเข้า-ออก</DialogTitle>
          <DialogDescription>{part.name} · เหลือ {fmt(part.qty)} {part.unit}</DialogDescription>
        </DialogHeader>
        {!rows ? (
          <div className="flex justify-center py-8 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-slate-500">ยังไม่มีประวัติ</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {rows.map((m) => {
              const plus = n(m.qty) > 0;
              const ref = m.ref_type === "service" && m.ref_id ? `S-${String(m.ref_id).padStart(8, "0")}` : "";
              return (
                <li key={m.id} className="flex items-start gap-3 py-2.5">
                  <span className={`w-16 shrink-0 text-right text-base font-bold tabular-nums ${plus ? "text-emerald-600" : "text-red-600"}`}>
                    {plus ? "+" : ""}{fmt(m.qty)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#1e2432]">
                      {m.kind_label} {ref && <span className="text-xs font-normal text-slate-500">{ref}</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[
                        when(m.created_at), m.created_by && `โดย ${m.created_by}`, m.supplier, m.bill_no && `บิล ${m.bill_no}`,
                        m.unit_price && `ขาย ฿${fmt(m.unit_price)}`, isAdmin && m.kind === "in" && m.unit_cost && `ทุน ฿${fmt(m.unit_cost)}`, m.note,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500 tabular-nums">เหลือ {fmt(m.qty_after)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
