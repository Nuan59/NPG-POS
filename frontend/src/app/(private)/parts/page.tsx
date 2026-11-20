"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import {
  AlertTriangle, ArrowDownToLine, History, Loader2, MoreHorizontal, Pencil, Plus, SlidersHorizontal, Trash2,
} from "lucide-react";
import SearchBar from "@/components/global/SearchBar";
import { DataTable } from "@/components/ui/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isValidEncodedPrice } from "@/services/PriceDecoder";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Part {
  id: number;
  code: string;
  name: string;
  fits: string;
  unit: string;
  cost_code?: string; // โค้ดทุน (เฉพาะ adm) - ไม่แสดงตัวเลขทุนที่ไหนเลย
  price: string;
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
  cost_code?: string;
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
 * - ทุน: กรอกเป็นโค้ดทุน (N C I O W M A E Z T = 1-0 ชุดเดียวกับราคาขายส่งรถ) ไม่แสดงตัวเลขทุน
 * - ปรับยอด ปิดอะไหล่ = เฉพาะ adm
 */
export default function PartsPage() {
  const { data: session } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const role = String((session as any)?.user?.role ?? "").toLowerCase();
  const isAdmin = role === "adm";
  const readOnly = role === "mon";

  const [rows, setRows] = useState<Part[]>([]);
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
      setRows(await call("/parts/"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, call]);

  useEffect(() => { load(); }, [load]);

  // ✅ ค้นหาในเครื่อง (เหมือนหน้าอื่น) - ชื่อ / รหัส / รุ่น / ที่เก็บ
  const display = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows
      .filter((p) => !lowOnly || p.low)
      .filter((p) => !t || [p.name, p.code, p.fits, p.location].some((v) => (v || "").toLowerCase().includes(t)));
  }, [rows, q, lowOnly]);
  const lowCount = rows.filter((p) => p.low).length;

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

  const columns: ColumnDef<Part>[] = [
    { accessorKey: "code", header: "รหัส", cell: ({ row }) => row.original.code || "-" },
    { accessorKey: "name", header: "ชื่ออะไหล่" },
    { accessorKey: "fits", header: "ใช้กับรุ่น", cell: ({ row }) => row.original.fits || "-" },
    { accessorKey: "location", header: "ที่เก็บ", cell: ({ row }) => row.original.location || "-" },
    {
      accessorKey: "qty",
      header: "คงเหลือ",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <span className={`whitespace-nowrap ${p.low ? "text-red-600" : ""}`}>
            {fmt(p.qty)} {p.unit}
            {p.low && <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">ใกล้หมด</span>}
          </span>
        );
      },
    },
    { accessorKey: "price", header: "ราคาขาย", cell: ({ row }) => fmt(row.original.price) },
    {
      id: "actions",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!readOnly && (
                <DropdownMenuItem onClick={() => setReceiving(p)} className="flex justify-between gap-2 font-semibold text-orange-600 focus:text-orange-600">
                  <ArrowDownToLine className="h-4 w-4" /> รับเข้า
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setHistory(p)} className="flex justify-between gap-2">
                <History className="opacity-60 h-4 w-4" /> ประวัติเข้า-ออก
              </DropdownMenuItem>
              {!readOnly && (
                <DropdownMenuItem onClick={() => setEditing(p)} className="flex justify-between gap-2">
                  <Pencil className="opacity-60 h-4 w-4" /> แก้ไข
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAdjusting(p)} className="flex justify-between gap-2">
                    <SlidersHorizontal className="opacity-60 h-4 w-4" /> ปรับยอด
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deactivate(p)} className="flex justify-between gap-2 text-red-600 focus:text-red-600">
                    <Trash2 className="h-4 w-4" /> ปิดอะไหล่
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold prompt">อะไหล่</h2>
          <h6 className="prompt">
            รวมทั้งหมด: {display.length}
            {lowCount > 0 && <span className="ml-3 text-red-600">ใกล้หมด: {lowCount}</span>}
          </h6>
        </div>
        <div className="flex flex-col gap-2">
          <SearchBar value={q} onChange={setQ} placeholder="ค้นหาชื่อ รหัส รุ่นรถ ที่เก็บ..." />
          <div className="flex justify-end gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  onClick={() => setLowOnly(!lowOnly)}
                  className={`border rounded-sm shadow-sm p-1 ${lowOnly ? "bg-red-50 text-red-600 border-red-200" : "hover:bg-slate-100"}`}
                >
                  <AlertTriangle />
                </TooltipTrigger>
                <TooltipContent><p>{lowOnly ? "แสดงทั้งหมด" : "เฉพาะใกล้หมด"}</p></TooltipContent>
              </Tooltip>
              {!readOnly && (
                <Tooltip>
                  <TooltipTrigger onClick={() => setEditing("new")} className="border rounded-sm shadow-sm p-1 hover:bg-slate-100">
                    <Plus />
                  </TooltipTrigger>
                  <TooltipContent><p>เพิ่มอะไหล่</p></TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-14 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : (
        <ScrollArea className="h-[85%] mt-3">
          <DataTable data={display} columns={columns} />
        </ScrollArea>
      )}

      {editing && <PartForm part={editing === "new" ? null : editing} isAdmin={isAdmin} call={call} onClose={() => setEditing(null)} onSaved={load} />}
      {receiving && <ReceiveForm part={receiving} call={call} onClose={() => setReceiving(null)} onSaved={load} />}
      {adjusting && <AdjustForm part={adjusting} call={call} onClose={() => setAdjusting(null)} onSaved={load} />}
      {history && <HistoryDialog part={history} isAdmin={isAdmin} call={call} onClose={() => setHistory(null)} />}
    </>
  );
}

type Call = (path: string, method?: string, body?: object) => Promise<any>;

const DIGIT_TO_CODE: Record<string, string> = { "1": "N", "2": "C", "3": "I", "4": "O", "5": "W", "6": "M", "7": "A", "8": "E", "9": "Z", "0": "T" };

/** ✅ ช่องโค้ดทุน - พิมพ์ตัวอักษรได้อย่างเดียว (ตัวเลขจะถูกแปลงเป็นโค้ดให้) ไม่แสดงตัวเลขทุน */
const CostCodeField = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const valid = !value || isValidEncodedPrice(value);
  return (
    <Field label="โค้ดทุนต่อหน่วย" hint={valid ? "เช่น NTT · ไม่มีเว้นว่างได้" : "โค้ดไม่ถูกต้อง ใช้ได้แค่ N C I O W M A E Z T"}>
      <input
        value={value}
        onChange={(e) => {
          // พิมพ์ตัวเลข → แปลงเป็นตัวอักษรทีละตัว (1→N 2→C ... 0→T) ตัวอักษรคงไว้
          const raw = e.target.value.toUpperCase().replace(/\s/g, "");
          onChange(raw.split("").map((ch) => DIGIT_TO_CODE[ch] ?? ch).join(""));
        }}
        placeholder="โค้ดทุน"
        autoComplete="off"
        className={`${inputCls} font-mono tracking-widest uppercase ${valid ? "" : "border-red-400 focus:border-red-500"}`}
      />
    </Field>
  );
};

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
    price: part ? String(n(part.price)) : "",
    min_qty: part ? String(n(part.min_qty)) : "2", location: part?.location ?? "", notes: part?.notes ?? "",
    start_qty: "", cost_code: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (!f.name.trim()) return toast.error("กรุณาใส่ชื่ออะไหล่");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: f.name.trim(), code: f.code.trim(), fits: f.fits.trim(), unit: f.unit.trim() || "ชิ้น",
        price: n(f.price),
        min_qty: n(f.min_qty), location: f.location.trim(), notes: f.notes,
      };
      if (part) await call(`/parts/${part.id}/`, "PATCH", body);
      else await call("/parts/", "POST", { ...body, start_qty: n(f.start_qty), unit_cost_code: f.cost_code });
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
          <Field label="เตือนเมื่อเหลือไม่เกิน"><input value={f.min_qty} onChange={set("min_qty")} inputMode="decimal" className={inputCls} /></Field>
          <Field label="ที่เก็บ"><input value={f.location} onChange={set("location")} placeholder="เช่น ชั้น A2" className={inputCls} /></Field>
          {!part && (
            <>
              <Field label="มีอยู่ตอนนี้กี่ชิ้น" hint="ยังไม่มีของ ใส่ 0"><input value={f.start_qty} onChange={set("start_qty")} inputMode="decimal" className={inputCls} /></Field>
              <CostCodeField value={f.cost_code} onChange={(v) => setF({ ...f, cost_code: v })} />
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
  const [f, setF] = useState({ qty: "", cost_code: part.cost_code ?? "", supplier: "", bill_no: "", note: "" });
  const [payCash, setPayCash] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    if (n(f.qty) <= 0) return toast.error("กรุณาใส่จำนวนที่รับเข้า");
    setSaving(true);
    try {
      if (f.cost_code && !isValidEncodedPrice(f.cost_code)) {
        setSaving(false);
        return toast.error("โค้ดทุนไม่ถูกต้อง ใช้ได้แค่ N C I O W M A E Z T");
      }
      await call(`/parts/${part.id}/receive/`, "POST", {
        qty: n(f.qty), unit_cost_code: f.cost_code, supplier: f.supplier, bill_no: f.bill_no, note: f.note, pay_cash: payCash,
      });
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
          <CostCodeField value={f.cost_code} onChange={(v) => setF({ ...f, cost_code: v })} />
          <Field label="ซื้อจากร้าน"><input value={f.supplier} onChange={set("supplier")} className={inputCls} /></Field>
          <Field label="เลขที่บิล"><input value={f.bill_no} onChange={set("bill_no")} className={inputCls} /></Field>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input type="checkbox" checked={payCash} onChange={(e) => setPayCash(e.target.checked)} className="mt-1 h-5 w-5 accent-[#F26B1D]" />
          <span className="text-sm">
            <b>จ่ายเงินสดจากลิ้นชัก</b> — ลงรายจ่ายในหน้ารายรับ-รายจ่ายวันนี้ให้เลย
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
                        m.unit_price && `ขาย ฿${fmt(m.unit_price)}`, isAdmin && m.kind === "in" && m.cost_code && `โค้ดทุน ${m.cost_code}`, m.note,
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
