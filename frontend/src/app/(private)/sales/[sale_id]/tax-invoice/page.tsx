"use client";
// ✅ ใบกำกับภาษี (ขายรถ) - ออกจาก ประวัติการขาย → … → ใบกำกับภาษี
// ยังไม่มีใบ: ฟอร์ม (ค่าตั้งต้นจากรายการขาย แก้ได้) → ออกใบ (เลข INV-000001 รันต่อเนื่อง) → เปิด PDF
// มีใบแล้ว: ผู้รับ / ผู้ออก / วันที่ / ยอด + พิมพ์ซ้ำ / adm ยกเลิก (ใบยังอยู่ เลขไม่ถูกใช้ซ้ำ)
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";
import { ArrowLeft, Eye, FileText, Loader2, Printer, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import TaxInvoiceTemplate, { TaxInvoiceData } from "@/components/pdf/TaxInvoiceTemplate";

interface Invoice extends TaxInvoiceData {
  id: number;
  order_id: number;
}
interface Defaults {
  amount: number;
  buyer_name: string;
  buyer_address: string;
  buyer_tax_id: string;
  buyer_branch: string;
  buyer_phone: string;
  item_description: string;
  issue_date: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const money = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const thaiDate = (iso?: string | null) =>
  iso ? new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : "-";
// ✅ สูตรเดียวกับ backend: ราคาสุทธิรวม VAT → มูลค่าสินค้า = ยอด x 100/107
const splitVat = (amount: number, rate = 7) => {
  const total = Math.round(amount * 100) / 100;
  const base = Math.round((total * 100 * 100) / (100 + rate)) / 100;
  return { total, base, vat: Math.round((total - base) * 100) / 100 };
};

export default function TaxInvoicePage() {
  const { sale_id } = useParams() as { sale_id: string };
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [canIssue, setCanIssue] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [form, setForm] = useState<Defaults | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelFor, setCancelFor] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const call = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(`${API}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `เกิดข้อผิดพลาด (${res.status})`);
      return data;
    },
    [token]
  );

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const d = await call(`/tax-invoices/?order=${sale_id}`);
      setInvoices(d.invoices || []);
      setCanIssue(!!d.can_issue);
      setCanCancel(!!d.can_cancel);
      setForm(d.defaults);
      setAmountInput(String(d.defaults?.amount ?? ""));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [call, sale_id, token]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") load();
  }, [status, load, router]);

  const openPdf = async (inv: Invoice) => {
    // เปิดแท็บก่อน (กัน browser บล็อก popup) แล้วค่อยใส่ PDF
    const win = window.open("", "_blank");
    try {
      const blob = await pdf(<TaxInvoiceTemplate inv={inv} />).toBlob();
      const url = URL.createObjectURL(blob);
      if (win) win.location.href = url;
      else window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      win?.close();
      toast.error("สร้าง PDF ไม่สำเร็จ");
    }
  };

  // ✅ ดูตัวอย่างก่อนออก - ใช้ข้อมูลในฟอร์ม ยังไม่บันทึก ยังไม่ใช้เลขที่
  const previewPdf = () => {
    if (!form) return;
    const { total, base, vat } = splitVat(Number(amountInput) || 0);
    openPdf({
      id: 0, order_id: Number(sale_id), number: "ตัวอย่าง (ยังไม่ออกเลข)", status: "preview",
      issue_date: form.issue_date, buyer_name: form.buyer_name, buyer_address: form.buyer_address,
      buyer_tax_id: form.buyer_tax_id.replace(/\D/g, ""), buyer_branch: form.buyer_branch, buyer_phone: form.buyer_phone,
      item_description: form.item_description, amount: total, base_amount: base, vat_amount: vat, vat_rate: 7,
      issued_by: (session as any)?.user?.name || (session as any)?.user?.username || "",
    });
  };

  const issue = async () => {
    if (!form || busy) return;
    setBusy(true);
    try {
      const inv: Invoice = await call("/tax-invoices/", {
        method: "POST",
        body: JSON.stringify({ order: Number(sale_id), ...form, amount: Number(amountInput) }),
      });
      toast.success(`ออกใบกำกับภาษี ${inv.number} แล้ว`);
      setConfirmOpen(false);
      await load();
      openPdf(inv);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!cancelFor || busy) return;
    if (!cancelReason.trim()) {
      toast.error("กรุณาใส่เหตุผลที่ยกเลิก");
      return;
    }
    setBusy(true);
    try {
      await call(`/tax-invoices/${cancelFor.id}/cancel/`, { method: "POST", body: JSON.stringify({ reason: cancelReason.trim() }) });
      toast.success(`ยกเลิก ${cancelFor.number} แล้ว`);
      setCancelFor(null);
      setCancelReason("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const active = invoices.find((i) => i.status === "active") || null;
  const cancelled = invoices.filter((i) => i.status === "cancelled");
  const amountNum = Number(amountInput) || 0;
  const preview = splitVat(amountNum);
  const set = (k: keyof Defaults) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));
  const taxIdDigits = (form?.buyer_tax_id || "").replace(/\D/g, "");
  const taxIdBad = !!form?.buyer_tax_id && taxIdDigits.length !== 13;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold prompt">ใบกำกับภาษี</h2>
          <h6 className="prompt">รายการขาย PH-{String(sale_id).padStart(8, "0")}</h6>
        </div>
        <div className="flex items-start justify-end">
          <Link href="/sales" className="border rounded-sm shadow-sm p-1 hover:bg-slate-100" title="กลับประวัติการขาย">
            <ArrowLeft />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-14 text-slate-400"><Loader2 className="animate-spin" /></div>
      ) : active ? (
        // ---------------- มีใบแล้ว
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <FileText className="text-[#F26B1D]" />
            <span className="font-mono text-2xl font-bold">{active.number}</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">ใช้งาน</span>
            <div className="ml-auto flex gap-2">
              <Button onClick={() => openPdf(active)} className="gap-2 bg-[#F26B1D] hover:bg-[#d95c14] text-white">
                <Printer size={16} /> พิมพ์ใบกำกับภาษี
              </Button>
              {canCancel && (
                <Button variant="outline" className="gap-2 text-red-600" onClick={() => setCancelFor(active)}>
                  <XCircle size={16} /> ยกเลิก
                </Button>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">ผู้รับ (ผู้ซื้อ)</p>
              <p className="font-semibold">{active.buyer_name}</p>
              <p className="text-slate-600">{active.buyer_address}</p>
              <p className="text-slate-600">เลขผู้เสียภาษี {active.buyer_tax_id || "-"}{active.buyer_branch ? ` · สาขา ${active.buyer_branch}` : ""}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">ผู้ออก</p>
              <p className="font-semibold">{active.issued_by || "-"}</p>
              <p className="text-xs text-slate-500 mt-2">วันที่ออก</p>
              <p className="font-semibold">{thaiDate(active.issue_date)}</p>
            </div>
            <div className="tabular-nums">
              <div className="flex justify-between"><span className="text-slate-500">มูลค่าสินค้า</span><span>{money(active.base_amount)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">VAT {active.vat_rate}%</span><span>{money(active.vat_amount)}</span></div>
              <div className="flex justify-between border-t border-dashed mt-1 pt-1 font-bold"><span>รวม</span><span>{money(active.amount)} ฿</span></div>
            </div>
          </div>
          <p className="text-xs text-slate-500">{active.item_description}</p>
        </section>
      ) : !canIssue ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          รายการนี้ยังไม่ได้ออกใบกำกับภาษี · คุณไม่มีสิทธิ์ออกใบ (ให้ adm เปิดสิทธิ์ <b>ใบกำกับภาษี</b> ที่หน้าพนักงาน)
        </section>
      ) : (
        form && (
          // ---------------- ฟอร์มออกใบ
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-sm text-slate-600">
              เช็คข้อมูลผู้ซื้อและยอดเงินก่อนกด <b>ออกใบกำกับภาษี</b> ระบบให้เลขที่ใบเอง (ออกแล้วแก้ไม่ได้ ถ้าผิดให้ adm ยกเลิกแล้วออกใหม่)
            </p>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-semibold">ผู้รับ (ผู้ซื้อ)</h3>
                <div className="space-y-1"><Label>ชื่อ / ชื่อบริษัท *</Label><Input value={form.buyer_name} onChange={set("buyer_name")} /></div>
                <div className="space-y-1"><Label>ที่อยู่ *</Label><Textarea rows={2} value={form.buyer_address} onChange={set("buyer_address")} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>เลขประจำตัวผู้เสียภาษี / บัตรประชาชน</Label>
                    <Input inputMode="numeric" value={form.buyer_tax_id} onChange={set("buyer_tax_id")} />
                    {taxIdBad && <p className="text-xs text-red-600">ต้องเป็นตัวเลข 13 หลัก</p>}
                  </div>
                  <div className="space-y-1"><Label>สาขา (ถ้าเป็นบริษัท)</Label><Input placeholder="เช่น สำนักงานใหญ่" value={form.buyer_branch} onChange={set("buyer_branch")} /></div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold">รายการ</h3>
                <div className="space-y-1"><Label>รายละเอียด</Label><Textarea rows={2} value={form.item_description} onChange={set("item_description")} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>ยอดรวม VAT (ราคาสุทธิ) *</Label>
                    <Input type="number" inputMode="decimal" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} />
                    <p className="text-xs text-slate-500">ค่าตั้งต้น = ราคารถหลังหักส่วนลด</p>
                  </div>
                  <div className="space-y-1"><Label>วันที่ออก</Label><Input type="date" value={form.issue_date} max={new Date().toISOString().slice(0, 10)} onChange={set("issue_date")} /></div>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm tabular-nums space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">มูลค่าสินค้า (ถอด VAT)</span><span>{money(preview.base)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">ภาษีมูลค่าเพิ่ม 7%</span><span>{money(preview.vat)}</span></div>
                  <div className="flex justify-between border-t border-dashed pt-1 font-bold"><span>รวมทั้งสิ้น</span><span>{money(preview.total)} ฿</span></div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="gap-2" disabled={amountNum <= 0} onClick={previewPdf}>
                <Eye size={16} /> ดูตัวอย่าง
              </Button>
              <Button
                disabled={!form.buyer_name.trim() || !form.buyer_address.trim() || amountNum <= 0 || taxIdBad}
                onClick={() => setConfirmOpen(true)}
                className="gap-2 bg-[#F26B1D] hover:bg-[#d95c14] text-white"
              >
                <FileText size={16} /> ออกใบกำกับภาษี
              </Button>
            </div>
          </section>
        )
      )}

      {cancelled.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white">
          <p className="px-4 py-3 border-b text-sm font-medium">ใบที่ยกเลิกแล้ว</p>
          <div className="divide-y">
            {cancelled.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-slate-500">
                <span className="font-mono line-through">{i.number}</span>
                <span>{thaiDate(i.issue_date)} · {money(i.amount)} ฿</span>
                <span>ยกเลิกโดย {i.cancelled_by} · {i.cancel_reason}</span>
                <Button variant="ghost" size="sm" className="ml-auto gap-1" onClick={() => openPdf(i)}>
                  <Printer size={14} /> ดู
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ยืนยันออกใบ */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !busy && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ออกใบกำกับภาษี?</DialogTitle>
            <DialogDescription>ออกแล้วแก้ไม่ได้ ถ้าผิดต้องให้ adm ยกเลิกแล้วออกใหม่ (ได้เลขใหม่)</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-1 text-sm">
              <p>ผู้รับ: <b>{form.buyer_name}</b></p>
              <p>ผู้ออก: <b>{(session as any)?.user?.name || (session as any)?.user?.username}</b></p>
              <p>วันที่: <b>{thaiDate(form.issue_date)}</b></p>
              <p>ยอด: <b>{money(preview.total)} ฿</b> (VAT {money(preview.vat)})</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>ยกเลิก</Button>
            <Button onClick={issue} disabled={busy} className="bg-[#F26B1D] hover:bg-[#d95c14] text-white">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยันออกใบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* adm ยกเลิกใบ */}
      <Dialog open={!!cancelFor} onOpenChange={(o) => !o && !busy && setCancelFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยกเลิก {cancelFor?.number}?</DialogTitle>
            <DialogDescription>ใบนี้จะยังเก็บไว้ (ขึ้นว่า ยกเลิก) เลขที่นี้จะไม่ถูกใช้ซ้ำ แล้วออกใบใหม่ได้</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>เหตุผล *</Label>
            <Input placeholder="เช่น ชื่อผู้ซื้อผิด" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelFor(null)} disabled={busy}>ไม่ยกเลิก</Button>
            <Button onClick={cancel} disabled={busy} className="bg-red-600 hover:bg-red-700 text-white">ยืนยันยกเลิก</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
