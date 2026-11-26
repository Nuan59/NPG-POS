"use client";
// ✅ แท็บ "ใบกำกับภาษีซื้อ" - บันทึกใบกำกับที่ร้านได้รับจากผู้ขาย (ซื้อรถ / อะไหล่ เข้า) ใช้หักภาษีขาย
// พนักงานบันทึกได้ + เห็นเฉพาะที่ตัวเองบันทึก (ราคาซื้อ = ต้นทุน) / adm เห็นทั้งหมด + ยอดรวม + ยกเลิก
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Plus, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { API, TH_MONTHS, money, selectCls, thDate, yearOptions } from "./taxShared";

interface Row {
  id: number;
  invoice_date: string;
  tax_year: number;
  tax_month: number;
  supplier_name: string;
  supplier_tax_id: string;
  supplier_branch: string;
  invoice_no: string;
  description: string;
  base_amount: number;
  vat_amount: number;
  amount: number;
  note: string;
  status: "active" | "cancelled";
  created_by: string;
  cancelled_by: string;
  cancel_reason: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({
  invoice_date: today(), supplier_name: "", supplier_tax_id: "", supplier_branch: "", invoice_no: "",
  description: "", amount: "", vat_amount: "", tax_month: "", tax_year: "", note: "",
});

export default function InputTaxTab() {
  const { data: session } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const role = String((session as any)?.user?.role ?? "").toLowerCase();
  const readOnly = role === "mon";

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | "">(new Date().getMonth() + 1);
  const [rows, setRows] = useState<Row[]>([]);
  const [seeAll, setSeeAll] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [canAdd, setCanAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [vatTouched, setVatTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelFor, setCancelFor] = useState<Row | null>(null);
  const [reason, setReason] = useState("");

  const call = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `เกิดข้อผิดพลาด (${res.status})`);
      return d;
    },
    [token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const d = await call(`/input-tax-invoices/?year=${year}&month=${month || ""}`);
      setRows(d.invoices || []);
      setSeeAll(!!d.all);
      setCanCancel(!!d.can_cancel);
      setCanAdd(!!d.can_add);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [call, token, year, month]);

  useEffect(() => { load(); }, [load]);

  const amountNum = Number(String(form.amount).replace(/,/g, "")) || 0;
  const autoVat = Math.round((amountNum - Math.round((amountNum * 10000) / 107) / 100) * 100) / 100;
  const vatNum = vatTouched && form.vat_amount !== "" ? Number(form.vat_amount) || 0 : autoVat;
  const set = (k: keyof ReturnType<typeof emptyForm>) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const body: any = { ...form, amount: amountNum };
      body.vat_amount = vatTouched && form.vat_amount !== "" ? Number(form.vat_amount) : undefined;
      if (!form.tax_month) delete body.tax_month;
      if (!form.tax_year) delete body.tax_year;
      const r = await call("/input-tax-invoices/", { method: "POST", body: JSON.stringify(body) });
      toast.success(`บันทึกใบกำกับภาษีซื้อ ${r.invoice_no} แล้ว`);
      setOpen(false);
      setForm(emptyForm());
      setVatTouched(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    if (!cancelFor || busy) return;
    setBusy(true);
    try {
      await call(`/input-tax-invoices/${cancelFor.id}/cancel/`, { method: "POST", body: JSON.stringify({ reason }) });
      toast.success("ยกเลิกแล้ว");
      setCancelFor(null);
      setReason("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const active = rows.filter((r) => r.status === "active");
  const sum = (k: "base_amount" | "vat_amount" | "amount") => active.reduce((s, r) => s + r[k], 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-[#7A7A7A] space-y-1">
          <span>เดือนภาษี</span>
          <select className={`${selectCls} block`} value={month} onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}>
            <option value="">ทั้งปี</option>
            {TH_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </label>
        <label className="text-xs text-[#7A7A7A] space-y-1">
          <span>ปี</span>
          <select className={`${selectCls} block`} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearOptions().map((y) => <option key={y} value={y}>{y + 543}</option>)}
          </select>
        </label>
        {!readOnly && canAdd && (
          <Button onClick={() => setOpen(true)} className="ml-auto gap-2 bg-[#F26B1D] hover:bg-[#d95c14] text-white">
            <Plus size={16} /> บันทึกใบกำกับภาษีซื้อ
          </Button>
        )}
      </div>
      {!seeAll && (
        <p className="text-xs text-slate-500">แสดงเฉพาะใบที่คุณบันทึก (ใบทั้งหมดและยอดรวม adm ดูได้ที่แท็บ สรุปภาษี)</p>
      )}

      <div className="rounded-md bg-white">
        <Table>
          <TableHeader className="bg-slate-100">
            <TableRow>
              {["วันที่ในใบ", "ผู้ขาย", "เลขที่ใบ", "รายการ", "มูลค่า", "VAT", "รวม", "เดือนภาษี", "ผู้บันทึก"].map((h) => (
                <TableHead key={h} className={`text-slate-900 font-bold ${["มูลค่า", "VAT", "รวม"].includes(h) ? "text-right" : "text-center"}`}>{h}</TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="h-24 text-center"><Loader2 className="mx-auto animate-spin text-slate-400" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="h-24 text-center text-slate-500">ยังไม่มีใบกำกับภาษีซื้อในช่วงนี้</TableCell></TableRow>
            ) : (
              rows.map((r) => {
                const off = r.status === "cancelled";
                return (
                  <TableRow key={r.id} className={off ? "text-slate-400" : ""}>
                    <TableCell className="text-center whitespace-nowrap">{thDate(r.invoice_date)}</TableCell>
                    <TableCell className="text-center">
                      {r.supplier_name}
                      {r.supplier_tax_id && <span className="block text-xs text-slate-400">{r.supplier_tax_id}{r.supplier_branch ? ` · ${r.supplier_branch}` : ""}</span>}
                    </TableCell>
                    <TableCell className={`text-center font-mono ${off ? "line-through" : ""}`}>{r.invoice_no}</TableCell>
                    <TableCell className="max-w-[240px]"><span className="line-clamp-2">{r.description || "-"}</span></TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.base_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(r.vat_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{money(r.amount)}</TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {TH_MONTHS[r.tax_month - 1]?.slice(0, 3)}. {r.tax_year + 543}
                      {off && <span className="block text-xs text-red-500">ยกเลิก · {r.cancel_reason}</span>}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">{r.created_by}</TableCell>
                    <TableCell>
                      {canCancel && !off && (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" aria-label="เมนู"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setCancelFor(r)}>
                              <XCircle className="mr-2 h-4 w-4" /> ยกเลิก
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            {seeAll && active.length > 0 && (
              <TableRow className="bg-slate-50 font-bold">
                <TableCell colSpan={4} className="text-right">รวม {active.length} ใบ</TableCell>
                <TableCell className="text-right tabular-nums">{money(sum("base_amount"))}</TableCell>
                <TableCell className="text-right tabular-nums">{money(sum("vat_amount"))}</TableCell>
                <TableCell className="text-right tabular-nums">{money(sum("amount"))}</TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* บันทึกใบ */}
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>บันทึกใบกำกับภาษีซื้อ</DialogTitle>
            <DialogDescription>ใบกำกับภาษีที่ร้านได้รับจากผู้ขาย ใส่ตามที่พิมพ์ในใบ</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>วันที่ในใบ *</Label><Input type="date" max={today()} value={form.invoice_date} onChange={set("invoice_date")} /></div>
              <div className="space-y-1"><Label>เลขที่ใบกำกับ *</Label><Input value={form.invoice_no} onChange={set("invoice_no")} /></div>
            </div>
            <div className="space-y-1"><Label>ชื่อผู้ขาย *</Label><Input placeholder="เช่น บริษัท ไทยยามาฮ่ามอเตอร์ จำกัด" value={form.supplier_name} onChange={set("supplier_name")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>เลขผู้เสียภาษีผู้ขาย</Label><Input inputMode="numeric" placeholder="13 หลัก" value={form.supplier_tax_id} onChange={set("supplier_tax_id")} /></div>
              <div className="space-y-1"><Label>สาขา</Label><Input placeholder="เช่น สำนักงานใหญ่" value={form.supplier_branch} onChange={set("supplier_branch")} /></div>
            </div>
            <div className="space-y-1"><Label>รายการ</Label><Input placeholder="เช่น รถ Fazzio 2 คัน" value={form.description} onChange={set("description")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>ยอดรวม VAT *</Label><Input type="number" inputMode="decimal" value={form.amount} onChange={set("amount")} /></div>
              <div className="space-y-1">
                <Label>VAT ตามใบ</Label>
                <Input
                  type="number" inputMode="decimal" placeholder={autoVat ? autoVat.toFixed(2) : "คิดให้เอง 7/107"}
                  value={form.vat_amount}
                  onChange={(e) => { setVatTouched(true); setForm((f) => ({ ...f, vat_amount: e.target.value })); }}
                />
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm tabular-nums space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">มูลค่าสินค้า</span><span>{money(amountNum - vatNum)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">ภาษีซื้อ (VAT)</span><span>{money(vatNum)}</span></div>
              <div className="flex justify-between border-t border-dashed pt-1 font-bold"><span>รวม</span><span>{money(amountNum)} ฿</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-[#7A7A7A] space-y-1">
                <span>ใช้ยื่นเดือน (ไม่เลือก = เดือนในใบ)</span>
                <select className={`${selectCls} w-full`} value={form.tax_month} onChange={set("tax_month")}>
                  <option value="">ตามเดือนในใบ</option>
                  {TH_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </label>
              <label className="text-xs text-[#7A7A7A] space-y-1">
                <span>ปี</span>
                <select className={`${selectCls} w-full`} value={form.tax_year} onChange={set("tax_year")}>
                  <option value="">ตามปีในใบ</option>
                  {yearOptions().map((y) => <option key={y} value={y}>{y + 543}</option>)}
                </select>
              </label>
            </div>
            <div className="space-y-1"><Label>หมายเหตุ</Label><Input value={form.note} onChange={set("note")} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>ยกเลิก</Button>
            <Button
              onClick={save}
              disabled={busy || !form.supplier_name.trim() || !form.invoice_no.trim() || amountNum <= 0}
              className="bg-[#F26B1D] hover:bg-[#d95c14] text-white"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* adm ยกเลิก */}
      <Dialog open={!!cancelFor} onOpenChange={(o) => !o && !busy && setCancelFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยกเลิกใบ {cancelFor?.invoice_no}?</DialogTitle>
            <DialogDescription>ใบยังเก็บไว้ (ขึ้นว่า ยกเลิก) และไม่นับในสรุปภาษี</DialogDescription>
          </DialogHeader>
          <div className="space-y-1"><Label>เหตุผล *</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น บันทึกซ้ำ" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelFor(null)} disabled={busy}>ไม่ยกเลิก</Button>
            <Button onClick={doCancel} disabled={busy || !reason.trim()} className="bg-red-600 hover:bg-red-700 text-white">ยืนยันยกเลิก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
