"use client";
// MonitorInbox.tsx
// วางไฟล์นี้ใน: frontend/src/components/global/MonitorInbox.tsx
// แสดงบนหน้าหลักของ "ผู้ตรวจสอบ" (role = mon) เท่านั้น
// ออกแบบให้ใช้ง่ายที่สุด: ตัวหนังสือใหญ่ ปุ่มใหญ่ กดแล้วถามยืนยันอีกครั้งเสมอ
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Banknote, Receipt, Check, X, ImageIcon, RefreshCw, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface HandoverItem {
  source: string;
  source_id: number;
  amount: number;
  description: string;
}
interface Handover {
  id: number;
  number: string;
  created_by_name: string;
  total: number;
  note: string;
  created_at: string;
  items: HandoverItem[];
}
interface Expense {
  id: number;
  number: string;
  created_by_name: string;
  category: string;
  description: string;
  amount: number;
  has_receipt: boolean;
  created_at: string;
}

type Task =
  | { kind: "cash"; key: string; at: string; h: Handover }
  | { kind: "expense"; key: string; at: string; e: Expense };

type Pending =
  | { mode: "receive"; h: Handover }
  | { mode: "partial"; h: Handover }
  | { mode: "approve"; e: Expense }
  | { mode: "reject"; e: Expense };

const REJECT_REASONS = ["ไม่มีใบเสร็จ", "ยอดเงินไม่ถูกต้อง", "ไม่จำเป็นต้องจ่าย"];

const baht = (n: number) => `${Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** ปุ่มใหญ่ใช้ซ้ำ */
const BigButton = ({
  children, onClick, tone = "primary", disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "primary" | "gray" | "navy";
  disabled?: boolean;
}) => {
  const cls = {
    // ธีมร้าน: ส้ม #F26B1D / กรม #1e2432 / เทา #7A7A7A
    primary: "bg-[#F26B1D] hover:bg-[#e25d10] active:bg-[#c94f0a] text-white shadow-[0_6px_16px_-6px_rgba(242,107,29,0.6)]",
    gray: "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-[#1e2432]",
    navy: "bg-[#1e2432] hover:bg-[#2a3144] active:bg-black text-white",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full min-h-[56px] rounded-2xl px-4 text-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
};

export default function MonitorInbox() {
  const { data: session, status } = useSession();
  const token = (session as any)?.user?.accessToken;
  const role = String((session as any)?.user?.role ?? "").toLowerCase();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [receipt, setReceipt] = useState<{ e: Expense; src: string | null } | null>(null);

  const call = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(`${API_BASE_URL}/${path}`, {
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
      const [hs, es] = await Promise.all([
        call("cash-handover/?status=pending&limit=50").catch(() => []),
        call("expense-requests/?status=pending&limit=50").catch(() => []),
      ]);
      const list: Task[] = [
        ...(Array.isArray(hs) ? hs : []).map((h: Handover) => ({ kind: "cash" as const, key: `c${h.id}`, at: h.created_at, h })),
        ...(Array.isArray(es) ? es : []).map((e: Expense) => ({ kind: "expense" as const, key: `e${e.id}`, at: e.created_at, e })),
      ];
      list.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()); // เก่าสุดก่อน
      setTasks(list);
    } finally {
      setLoading(false);
    }
  }, [call, token]);

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status, load]);

  const close = () => {
    if (busy) return;
    setPending(null);
    setPartialAmount("");
    setRejectReason("");
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.mode === "receive") {
        await call(`cash-handover/${pending.h.id}/receive/`, { method: "POST", body: "{}" });
        toast.success(`รับเงิน ${baht(pending.h.total)} เรียบร้อย`);
      } else if (pending.mode === "partial") {
        await call(`cash-handover/${pending.h.id}/receive/`, {
          method: "POST",
          body: JSON.stringify({ received_amount: Number(partialAmount), note: "ได้รับไม่ครบ" }),
        });
        toast.success(`บันทึกว่าได้รับ ${baht(Number(partialAmount))} แล้ว`);
      } else if (pending.mode === "approve") {
        await call(`expense-requests/${pending.e.id}/approve/`, { method: "POST", body: "{}" });
        toast.success(`อนุมัติจ่าย ${baht(pending.e.amount)} เรียบร้อย`);
      } else {
        await call(`expense-requests/${pending.e.id}/reject/`, {
          method: "POST",
          body: JSON.stringify({ reason: rejectReason.trim() }),
        });
        toast.success("ไม่อนุมัติแล้ว");
      }
      setBusy(false);
      close();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง");
      setBusy(false);
    }
  };

  const openReceipt = async (e: Expense) => {
    setReceipt({ e, src: null });
    try {
      const res = await call(`expense-requests/${e.id}/receipt/`);
      setReceipt({ e, src: res.image || "" });
    } catch {
      setReceipt({ e, src: "" });
    }
  };

  if (status !== "authenticated" || role !== "mon") return null;

  const canConfirm =
    !busy &&
    (pending?.mode !== "partial" || (partialAmount !== "" && Number(partialAmount) >= 0)) &&
    (pending?.mode !== "reject" || rejectReason.trim() !== "");

  return (
    <section className="mt-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-1.5 h-7 bg-[#F26B1D] rounded-sm -skew-x-12" />
        <h2 className="text-2xl font-bold text-[#1e2432]">รายการรอคุณ</h2>
        {tasks.length > 0 && (
          <span className="min-w-[36px] h-9 px-2 rounded-full bg-[#F26B1D] text-white text-lg font-bold grid place-items-center">
            {tasks.length}
          </span>
        )}
        <button
          type="button"
          onClick={load}
          className="ml-auto flex items-center gap-1.5 text-base text-[#7A7A7A] px-3 py-2 rounded-xl hover:bg-gray-100 hover:text-[#1e2432]"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> โหลดใหม่
        </button>
      </div>

      {!loading && tasks.length === 0 && (
        <div className="rounded-3xl bg-white border border-gray-200 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-orange-50 grid place-items-center">
            <CheckCircle2 size={34} className="text-[#F26B1D]" />
          </div>
          <p className="mt-3 text-2xl font-bold text-[#1e2432]">ไม่มีรายการรอ</p>
          <p className="mt-1 text-lg text-[#7A7A7A]">ทำครบทุกอย่างแล้ว</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {tasks.map((t) =>
          t.kind === "cash" ? (
            <div key={t.key} className="rounded-3xl bg-white border border-gray-200 border-l-[6px] border-l-[#1e2432] p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#1e2432] text-white grid place-items-center shrink-0">
                  <Banknote size={30} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg text-[#7A7A7A]">รับเงินสดจาก</p>
                  <p className="text-2xl font-bold text-[#1e2432] truncate">{t.h.created_by_name}</p>
                </div>
              </div>
              <p className="mt-4 text-4xl font-extrabold text-[#1e2432] tabular-nums">{baht(t.h.total)}</p>
              <p className="mt-1 text-base text-[#7A7A7A]">
                {t.h.items.length} รายการ · ส่งเมื่อ {when(t.h.created_at)}
                {t.h.note && ` · ${t.h.note}`}
              </p>
              <div className="mt-4 space-y-2">
                <BigButton onClick={() => setPending({ mode: "receive", h: t.h })}>
                  <Check size={24} strokeWidth={3} /> ได้รับเงินแล้ว
                </BigButton>
                <BigButton
                  tone="gray"
                  onClick={() => {
                    setPartialAmount("");
                    setPending({ mode: "partial", h: t.h });
                  }}
                >
                  ได้รับไม่ครบ
                </BigButton>
              </div>
            </div>
          ) : (
            <div key={t.key} className="rounded-3xl bg-white border border-gray-200 border-l-[6px] border-l-[#F26B1D] p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#F26B1D] grid place-items-center shrink-0">
                  <Receipt size={30} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg text-[#7A7A7A]">{t.e.created_by_name} ขอจ่ายเงิน</p>
                  <p className="text-2xl font-bold text-[#1e2432] truncate">
                    {t.e.category ? `${t.e.category}` : "ค่าใช้จ่าย"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-4xl font-extrabold text-[#1e2432] tabular-nums">{baht(t.e.amount)}</p>
              <p className="mt-1 text-lg text-[#1e2432]">{t.e.description}</p>
              <div className="mt-1 flex items-center gap-3 text-base text-[#7A7A7A]">
                <span>ขอเมื่อ {when(t.e.created_at)}</span>
                {t.e.has_receipt && (
                  <button
                    type="button"
                    onClick={() => openReceipt(t.e)}
                    className="flex items-center gap-1 text-[#F26B1D] font-medium underline underline-offset-2"
                  >
                    <ImageIcon size={18} /> ดูใบเสร็จ
                  </button>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <BigButton
                  tone="gray"
                  onClick={() => {
                    setRejectReason("");
                    setPending({ mode: "reject", e: t.e });
                  }}
                >
                  <X size={22} strokeWidth={3} /> ไม่อนุมัติ
                </BigButton>
                <BigButton onClick={() => setPending({ mode: "approve", e: t.e })}>
                  <Check size={24} strokeWidth={3} /> อนุมัติ
                </BigButton>
              </div>
            </div>
          )
        )}
      </div>

      {/* ยืนยันทุกครั้งก่อนบันทึก */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          {pending && (
            <div className="text-center">
              <DialogTitle className="text-2xl font-bold leading-snug text-[#1e2432]">
                {pending.mode === "receive" && "ได้รับเงินครบแล้วใช่ไหม?"}
                {pending.mode === "partial" && "ได้รับเงินจริงเท่าไหร่?"}
                {pending.mode === "approve" && "อนุมัติให้จ่ายเงินใช่ไหม?"}
                {pending.mode === "reject" && "ไม่อนุมัติ เพราะอะไร?"}
              </DialogTitle>
              <DialogDescription className="mt-2 text-lg text-[#7A7A7A]">
                {(pending.mode === "receive" || pending.mode === "partial") && `จาก ${pending.h.created_by_name}`}
                {(pending.mode === "approve" || pending.mode === "reject") &&
                  `${pending.e.created_by_name} · ${pending.e.description}`}
              </DialogDescription>

              {pending.mode === "receive" && (
                <p className="mt-4 text-5xl font-extrabold text-[#F26B1D] tabular-nums">{baht(pending.h.total)}</p>
              )}
              {pending.mode === "approve" && (
                <p className="mt-4 text-5xl font-extrabold text-[#F26B1D] tabular-nums">{baht(pending.e.amount)}</p>
              )}

              {pending.mode === "partial" && (
                <div className="mt-4">
                  <p className="text-base text-[#7A7A7A]">ต้องได้ {baht(pending.h.total)}</p>
                  <input
                    type="number"
                    inputMode="decimal"
                    autoFocus
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="พิมพ์ยอดที่ได้รับ"
                    className="mt-2 w-full h-16 rounded-2xl border-2 border-gray-300 text-center text-3xl font-bold outline-none focus:border-[#F26B1D]"
                  />
                </div>
              )}

              {pending.mode === "reject" && (
                <div className="mt-4 space-y-2">
                  {REJECT_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRejectReason(r)}
                      className={`w-full min-h-[52px] rounded-2xl border-2 text-lg font-medium ${
                        rejectReason === r
                          ? "border-[#F26B1D] bg-orange-50 text-[#F26B1D]"
                          : "border-gray-200 text-[#1e2432]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                  <input
                    value={REJECT_REASONS.includes(rejectReason) ? "" : rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="หรือพิมพ์เหตุผลอื่น"
                    className="w-full h-14 rounded-2xl border-2 border-gray-200 px-4 text-lg outline-none focus:border-[#F26B1D]"
                  />
                </div>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3">
                <BigButton tone="gray" onClick={close} disabled={busy}>
                  ยกเลิก
                </BigButton>
                <BigButton tone={pending.mode === "reject" ? "navy" : "primary"} onClick={confirm} disabled={!canConfirm}>
                  {busy ? "กำลังบันทึก..." : pending.mode === "reject" ? "ไม่อนุมัติ" : "ใช่ ยืนยัน"}
                </BigButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* รูปใบเสร็จ */}
      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-5">
          <DialogTitle className="text-xl font-bold">ใบเสร็จ · {receipt && baht(receipt.e.amount)}</DialogTitle>
          <DialogDescription className="text-base">{receipt?.e.description}</DialogDescription>
          {receipt?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={receipt.src} alt="ใบเสร็จ" className="w-full max-h-[65vh] object-contain rounded-2xl border" />
          ) : (
            <p className="py-10 text-center text-lg text-gray-400">
              {receipt?.src === "" ? "ไม่มีรูปใบเสร็จ" : "กำลังโหลดรูป..."}
            </p>
          )}
          <BigButton tone="gray" onClick={() => setReceipt(null)}>
            ปิด
          </BigButton>
        </DialogContent>
      </Dialog>
    </section>
  );
}