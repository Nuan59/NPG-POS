"use client";
// ExpenseRequestPanel.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/tasks/components/ExpenseRequestPanel.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Receipt, Plus, CheckCircle2, XCircle, Clock, Pencil, Undo2, Trash2, ImageIcon, Camera, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ต้องตรงกับ CATEGORIES ใน backend/api/views/ExpenseRequestViewSet.py
const CATEGORIES = [
  "น้ำมัน", "อะไหล่/สินค้า", "ค่าแรง", "ค่าขนส่ง", "ค่าน้ำ/ไฟ/เน็ต",
  "อุปกรณ์/เครื่องเขียน", "อาหาร/เครื่องดื่ม", "เบ็ดเตล็ด", "อื่นๆ",
];

interface Expense {
  id: number;
  number: string;
  created_by_username: string;
  created_by_name: string;
  category: string;
  description: string;
  amount: number;
  has_receipt: boolean;
  status: "pending" | "approved" | "rejected";
  decided_by: string;
  decided_at: string | null;
  reject_reason: string;
  created_at: string;
}

type FormMode =
  | { kind: "create" }
  | { kind: "edit"; e: Expense }
  | { kind: "approve"; e: Expense };

const baht = (n: number) => `฿${Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "-";

/** ย่อรูปใบเสร็จก่อนส่ง (ด้านยาวสุด 1280px, JPEG) → data URL ขนาดราว 100-300KB */
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("ไฟล์นี้ไม่ใช่รูปภาพ"));
      img.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("ย่อรูปไม่สำเร็จ"));
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

const StatusChip = ({ e }: { e: Expense }) => {
  if (e.status === "pending")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
        <Clock size={12} /> รออนุมัติ
      </span>
    );
  if (e.status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        <XCircle size={12} /> ไม่อนุมัติ
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      <CheckCircle2 size={12} /> อนุมัติแล้ว
    </span>
  );
};

const CategoryChip = ({ c }: { c: string }) =>
  c ? (
    <span className="shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{c}</span>
  ) : null;

/**
 * รายการจ่าย
 * - ทุกคน: กด "ขอจ่ายเงิน" กรอกหมวดหมู่ / รายการ / จำนวนเงิน / แนบรูปใบเสร็จ → รอ adm อนุมัติ
 *          แก้ไข/ยกเลิกคำขอของตัวเองได้ระหว่างรออนุมัติ
 * - adm เท่านั้น: อนุมัติ (แก้ยอดได้ก่อนอนุมัติ) → ลงรายจ่ายเงินสดในหน้า รายรับ-รายจ่าย วันนี้ให้อัตโนมัติ
 *          ไม่อนุมัติ (ต้องใส่เหตุผล) / แก้ไขหลังอนุมัติ (รายจ่ายแก้ตาม) / ย้อนกลับไปรออนุมัติ (รายจ่ายถูกลบ)
 */
export default function ExpenseRequestPanel() {
  const { data: session, status } = useSession();
  const token = (session as any)?.user?.accessToken;
  const isAdmin = String((session as any)?.user?.role ?? "").toLowerCase() === "adm";

  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // ฟอร์ม (สร้าง / แก้ไข / อนุมัติ)
  const [form, setForm] = useState<FormMode | null>(null);
  const [fCategory, setFCategory] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fAmount, setFAmount] = useState("");
  const [fImage, setFImage] = useState<string | null>(null);
  const [fImageTouched, setFImageTouched] = useState(false);
  const [fImageLoading, setFImageLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [rejectFor, setRejectFor] = useState<Expense | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewImage, setViewImage] = useState<{ e: Expense; src: string | null } | null>(null);
  const [confirmAct, setConfirmAct] = useState<{ title: string; desc: string; label: string; run: () => Promise<void> } | null>(null);

  const api = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(`${API_BASE_URL}/expense-requests/${path}`, {
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
      const data = await api(`?limit=${isAdmin ? 50 : 20}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "โหลดรายการจ่ายไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [api, token, isAdmin]);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  const act = async (path: string, body: object, okMsg: string, after?: () => void) => {
    setBusy(true);
    try {
      await api(path, { method: "POST", body: JSON.stringify(body) });
      toast.success(okMsg);
      after?.();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ทำรายการไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const openForm = (mode: FormMode) => {
    const e = mode.kind === "create" ? null : mode.e;
    setFCategory(e?.category ?? "");
    setFDesc(e?.description ?? "");
    setFAmount(e ? String(e.amount) : "");
    setFImage(null);
    setFImageTouched(false);
    setForm(mode);
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setFImageLoading(true);
    try {
      setFImage(await compressImage(file));
      setFImageTouched(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "แนบรูปไม่สำเร็จ");
    } finally {
      setFImageLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const formValid = fDesc.trim() !== "" && Number(fAmount) > 0 && !fImageLoading;

  const submitForm = async () => {
    if (!form || !formValid) return;
    const base = { category: fCategory, description: fDesc.trim(), amount: Number(fAmount) };
    if (form.kind === "create") {
      setBusy(true);
      try {
        await api("", { method: "POST", body: JSON.stringify({ ...base, receipt_image: fImage }) });
        toast.success("ส่งคำขอจ่ายเงินแล้ว รอ adm อนุมัติ");
        setForm(null);
        load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "ส่งคำขอไม่สำเร็จ");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (form.kind === "edit") {
      const body = fImageTouched ? { ...base, receipt_image: fImage } : base;
      await act(`${form.e.id}/edit/`, body, `แก้ไข ${form.e.number} แล้ว`, () => setForm(null));
      return;
    }
    await act(`${form.e.id}/approve/`, base, `อนุมัติ ${form.e.number} แล้ว ลงรายจ่ายเงินสดให้เรียบร้อย`, () => setForm(null));
  };

  const openReceipt = async (e: Expense) => {
    setViewImage({ e, src: null });
    try {
      const res = await api(`${e.id}/receipt/`);
      setViewImage({ e, src: res.image || "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "โหลดรูปไม่สำเร็จ");
      setViewImage(null);
    }
  };

  if (status !== "authenticated" || loading) return null;

  const pending = items.filter((e) => e.status === "pending");
  const decided = items.filter((e) => e.status !== "pending");

  const ReceiptButton = ({ e }: { e: Expense }) =>
    e.has_receipt ? (
      <button
        type="button"
        onClick={() => openReceipt(e)}
        className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline"
      >
        <ImageIcon size={13} /> ใบเสร็จ
      </button>
    ) : (
      <span className="text-xs text-gray-400">ไม่มีใบเสร็จ</span>
    );

  return (
    <section className="mb-8 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-orange-600" />
          รายการจ่าย
        </h3>
        <Button size="sm" className="gap-1 bg-orange-600 hover:bg-orange-700" onClick={() => openForm({ kind: "create" })}>
          <Plus size={15} /> ขอจ่ายเงิน
        </Button>
      </div>

      {/* ---------------- adm: รออนุมัติ ---------------- */}
      {isAdmin && pending.length > 0 && (
        <div className="bg-white rounded-xl border">
          <p className="px-4 py-3 border-b text-sm font-medium flex items-center gap-2">
            รออนุมัติ
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500 text-white">{pending.length}</span>
          </p>
          <div className="divide-y">
            {pending.map((e) => (
              <div key={e.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {e.created_by_name} <span className="text-gray-400 font-normal text-sm">· {e.number}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <CategoryChip c={e.category} />
                      <span className="text-sm text-gray-700">{e.description}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">ขอเมื่อ {when(e.created_at)}</span>
                      <ReceiptButton e={e} />
                    </div>
                  </div>
                  <span className="text-lg font-bold tabular-nums">{baht(e.amount)}</span>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      aria-label="ลบคำขอ"
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 px-2"
                      onClick={() =>
                        setConfirmAct({
                          title: `ลบคำขอ ${e.number}`,
                          desc: `${e.description} ${baht(e.amount)} ของ ${e.created_by_name}`,
                          label: "ลบคำขอ",
                          run: () => act(`${e.id}/cancel/`, {}, `ลบ ${e.number} แล้ว`),
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setRejectFor(e);
                        setRejectReason("");
                      }}
                    >
                      ไม่อนุมัติ
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      className="gap-1 bg-green-600 hover:bg-green-700"
                      onClick={() => openForm({ kind: "approve", e })}
                    >
                      <CheckCircle2 size={15} /> อนุมัติ
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- adm: ตัดสินแล้ว / พนักงาน: คำขอของฉัน ---------------- */}
      {(isAdmin ? decided : items).length > 0 && (
        <div className="bg-white rounded-xl border">
          <p className="px-4 py-3 border-b text-sm font-medium">{isAdmin ? "อนุมัติ / ไม่อนุมัติล่าสุด" : "คำขอจ่ายของฉัน"}</p>
          <div className="divide-y">
            {(isAdmin ? decided.slice(0, 15) : items).map((e) => (
              <div key={e.id} className="px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  {isAdmin && <span className="font-medium">{e.created_by_name}</span>}
                  <span className="text-xs text-gray-400">{e.number}</span>
                  <StatusChip e={e} />
                  <span className="ml-auto font-semibold tabular-nums">{baht(e.amount)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <CategoryChip c={e.category} />
                  <span className="text-sm text-gray-700 min-w-0">{e.description}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <span className="text-xs text-gray-400">
                    {e.status === "pending" ? `ขอเมื่อ ${when(e.created_at)}` : `${e.decided_by} · ${when(e.decided_at)}`}
                  </span>
                  <ReceiptButton e={e} />
                  {e.status === "rejected" && e.reject_reason && (
                    <span className="text-xs text-red-600">เหตุผล: {e.reject_reason}</span>
                  )}
                  <div className="ml-auto flex gap-1">
                    {(isAdmin || e.status === "pending") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        className="h-8 gap-1 text-gray-600"
                        onClick={() => openForm({ kind: "edit", e })}
                      >
                        <Pencil size={13} /> แก้ไข
                      </Button>
                    )}
                    {!isAdmin && e.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        className="h-8 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() =>
                          setConfirmAct({
                            title: `ยกเลิกคำขอ ${e.number}`,
                            desc: `${e.description} ${baht(e.amount)}`,
                            label: "ยกเลิกคำขอ",
                            run: () => act(`${e.id}/cancel/`, {}, "ยกเลิกคำขอแล้ว"),
                          })
                        }
                      >
                        <X size={13} /> ยกเลิก
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        className="h-8 gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() =>
                          setConfirmAct({
                            title: `ย้อนกลับ ${e.number}`,
                            desc:
                              e.status === "approved"
                                ? `กลับไปรออนุมัติ และลบรายจ่าย ${baht(e.amount)} ในหน้ารายรับ-รายจ่ายออก`
                                : "กลับไปรออนุมัติ",
                            label: "ย้อนกลับ",
                            run: () => act(`${e.id}/reopen/`, {}, `${e.number} กลับไปรออนุมัติแล้ว`),
                          })
                        }
                      >
                        <Undo2 size={13} /> ย้อนกลับ
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ฟอร์ม ขอจ่าย / แก้ไข / อนุมัติ */}
      <Dialog open={!!form} onOpenChange={(o) => !o && !busy && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form?.kind === "create" && "ขอจ่ายเงิน"}
              {form?.kind === "edit" && `แก้ไข ${form.e.number}`}
              {form?.kind === "approve" && `อนุมัติ ${form.e.number}`}
            </DialogTitle>
            <DialogDescription>
              {form?.kind === "create" && "ส่งให้ adm อนุมัติ · อนุมัติแล้วจะลงรายจ่ายเงินสดให้อัตโนมัติ"}
              {form?.kind === "edit" &&
                (form.e.status === "approved"
                  ? "รายการนี้อนุมัติแล้ว · รายจ่ายในหน้ารายรับ-รายจ่ายจะแก้ตามให้"
                  : `ของ ${form.e.created_by_name}`)}
              {form?.kind === "approve" &&
                `ของ ${form.e.created_by_name} · ตรวจ/แก้ยอดได้ก่อนอนุมัติ → ลงรายจ่ายเงินสดวันนี้`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">หมวดหมู่</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFCategory(fCategory === c ? "" : c)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      fCategory === c
                        ? "bg-orange-600 border-orange-600 text-white"
                        : "bg-white border-gray-200 text-gray-700 hover:border-orange-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="ex-desc" className="text-sm font-medium">รายการ</label>
              <Input
                id="ex-desc"
                value={fDesc}
                maxLength={255}
                onChange={(e) => setFDesc(e.target.value)}
                placeholder="เช่น เติมน้ำมันรถส่งของ, ซื้อหลอดไฟหน้าร้าน"
              />
            </div>
            <div>
              <label htmlFor="ex-amount" className="text-sm font-medium">จำนวนเงิน (฿)</label>
              <Input
                id="ex-amount"
                type="number"
                inputMode="decimal"
                min={0}
                value={fAmount}
                onChange={(e) => setFAmount(e.target.value)}
                placeholder="0"
              />
            </div>

            {form?.kind !== "approve" && (
              <div>
                <p className="text-sm font-medium mb-2">รูปใบเสร็จ</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickImage(e.target.files?.[0])}
                />
                {fImage ? (
                  <div className="relative w-fit">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fImage} alt="ใบเสร็จ" className="max-h-40 rounded-lg border" />
                    <button
                      type="button"
                      aria-label="เอารูปออก"
                      onClick={() => {
                        setFImage(null);
                        setFImageTouched(true);
                      }}
                      className="absolute -top-2 -right-2 rounded-full bg-white border shadow p-1 text-gray-500 hover:text-red-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 w-full border-dashed"
                    disabled={fImageLoading}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Camera size={16} />
                    {fImageLoading ? "กำลังย่อรูป..." : "ถ่ายรูป / เลือกรูปใบเสร็จ"}
                  </Button>
                )}
                {form?.kind === "edit" && form.e.has_receipt && !fImageTouched && (
                  <p className="text-xs text-gray-500 mt-1">มีใบเสร็จเดิมอยู่แล้ว · เลือกรูปใหม่ถ้าต้องการเปลี่ยน</p>
                )}
              </div>
            )}

            {form?.kind === "approve" && (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <ReceiptButton e={form.e} />
                <span className="text-sm">
                  ลงรายจ่ายเงินสด <span className="font-semibold tabular-nums">{baht(Number(fAmount) || 0)}</span>
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={busy}>ยกเลิก</Button>
            <Button
              disabled={busy || !formValid}
              onClick={submitForm}
              className={
                form?.kind === "approve"
                  ? "gap-1 bg-green-600 hover:bg-green-700"
                  : "gap-1 bg-orange-600 hover:bg-orange-700"
              }
            >
              {form?.kind === "approve" ? <CheckCircle2 size={15} /> : null}
              {busy
                ? "กำลังบันทึก..."
                : form?.kind === "create"
                ? "ส่งคำขอ"
                : form?.kind === "approve"
                ? "ยืนยันอนุมัติ"
                : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* adm: ไม่อนุมัติ */}
      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && !busy && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ไม่อนุมัติ {rejectFor?.number}</DialogTitle>
            <DialogDescription>
              {rejectFor?.created_by_name} · {rejectFor?.description} {baht(rejectFor?.amount ?? 0)}
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="reject-reason" className="text-sm font-medium">เหตุผล (พนักงานจะเห็น)</label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="เช่น ไม่มีใบเสร็จ, ยอดไม่ตรงกับใบเสร็จ"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)} disabled={busy}>ยกเลิก</Button>
            <Button
              disabled={busy || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                rejectFor &&
                act(`${rejectFor.id}/reject/`, { reason: rejectReason }, `ไม่อนุมัติ ${rejectFor.number} แล้ว`, () =>
                  setRejectFor(null)
                )
              }
            >
              ยืนยันไม่อนุมัติ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ดูรูปใบเสร็จ */}
      <Dialog open={!!viewImage} onOpenChange={(o) => !o && setViewImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ใบเสร็จ {viewImage?.e.number}</DialogTitle>
            <DialogDescription>
              {viewImage?.e.description} · {baht(viewImage?.e.amount ?? 0)}
            </DialogDescription>
          </DialogHeader>
          {viewImage?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewImage.src} alt="ใบเสร็จ" className="w-full max-h-[70vh] object-contain rounded-lg border" />
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">
              {viewImage?.src === "" ? "ไม่มีรูปใบเสร็จ" : "กำลังโหลดรูป..."}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* ยืนยันก่อนลบ / ย้อนกลับ */}
      <Dialog open={!!confirmAct} onOpenChange={(o) => !o && !busy && setConfirmAct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmAct?.title}</DialogTitle>
            <DialogDescription>{confirmAct?.desc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAct(null)} disabled={busy}>ไม่ใช่</Button>
            <Button
              disabled={busy}
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!confirmAct) return;
                await confirmAct.run();
                setConfirmAct(null);
              }}
            >
              {confirmAct?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}