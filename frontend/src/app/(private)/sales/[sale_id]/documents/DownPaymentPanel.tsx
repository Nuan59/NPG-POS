"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface DownPaymentStatus {
  requested: boolean;
  sale_status: "pending" | "completed";
  finance_provider: string;
  account_id: number | null;
  account_type: "finance" | "down_payment" | null;
  data: {
    remaining_balance: number | string;
    installment_count: number | string;
    interest_rate: number | string;
    per_installment: number | string;
    next_payment_date: string;
  };
}

export const DOWN_PAYMENT_REFRESH_EVENT = "npg:down-payment-refresh";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

/**
 * ✅ สถานะบัญชีผ่อนดาวน์ของรายการขาย (หน้าเอกสาร)
 * - ขอผ่อนดาวน์ + จบรายการแล้ว + ยังไม่มีบัญชี → เตือนสีแดง / adm สร้างย้อนหลังได้ (แก้ตัวเลขก่อนได้)
 * - มีบัญชีแล้ว → ลิงก์ไปหน้า NPG
 * - ไม่ได้ขอผ่อนดาวน์ → ไม่แสดงอะไร
 */
export default function DownPaymentPanel({ orderId }: { orderId: number }) {
  const { data: session } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const role = String((session as any)?.user?.role ?? "").toLowerCase();
  const isAdmin = role === "adm" || role === "admin" || role === "administrator";

  const [status, setStatus] = useState<DownPaymentStatus | null>(null);
  const [form, setForm] = useState({ remaining_balance: "", installment_count: "", interest_rate: "", per_installment: "", next_payment_date: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${baseUrl}/order/${orderId}/down_payment/`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const d = (await res.json()) as DownPaymentStatus;
      setStatus(d);
      setForm({
        remaining_balance: String(d.data.remaining_balance || ""),
        installment_count: String(d.data.installment_count || ""),
        interest_rate: String(d.data.interest_rate || ""),
        per_installment: String(d.data.per_installment || ""),
        next_payment_date: String(d.data.next_payment_date || "").slice(0, 10),
      });
    } catch {
      /* ไม่ให้หน้าเอกสารพังเพราะส่วนนี้ */
    }
  }, [orderId, token]);

  useEffect(() => {
    load();
    const h = () => load();
    window.addEventListener(DOWN_PAYMENT_REFRESH_EVENT, h);
    return () => window.removeEventListener(DOWN_PAYMENT_REFRESH_EVENT, h);
  }, [load]);

  if (!status || !status.requested) return null;

  if (status.account_id) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <CheckCircle2 size={18} /> มีบัญชีผ่อนดาวน์แล้ว (NPG #{status.account_id})
        </span>
        <Link href={`/npg/${status.account_id}`} className="font-semibold underline underline-offset-2">
          ดูบัญชี
        </Link>
      </div>
    );
  }

  if (status.sale_status !== "completed") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <span>รายการนี้ขอผ่อนดาวน์ไว้ บัญชีผ่อนดาวน์จะขึ้นในหน้า NPG หลังกด <b>&quot;จบรายการ&quot;</b></span>
      </div>
    );
  }

  const create = async () => {
    if (!token || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${baseUrl}/order/${orderId}/down_payment/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || `ทำรายการไม่สำเร็จ (${res.status})`);
      toast.success(d.message || "สร้างบัญชีผ่อนดาวน์แล้ว");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = "number") => (
    <label className="text-xs text-slate-600 space-y-1">
      <span>{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none focus:border-[#F26B1D]"
      />
    </label>
  );

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
      <p className="text-sm text-red-700 flex items-start gap-2">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <span>
          รายการนี้ขอผ่อนดาวน์ แต่ <b>ยังไม่มีบัญชีผ่อนดาวน์ในหน้า NPG</b>
          {isAdmin ? " - ตรวจตัวเลขแล้วกดสร้างได้เลย" : " - แจ้ง adm ให้สร้างบัญชีให้"}
        </span>
      </p>
      {isAdmin && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {field("remaining_balance", "ยอดคงเหลือหลังงวดแรก (฿)")}
            {field("installment_count", "จำนวนงวด")}
            {field("per_installment", "ค่างวด (฿)")}
            {field("interest_rate", "ดอกเบี้ย (%/เดือน)")}
            {field("next_payment_date", "ครบกำหนดงวดถัดไป", "date")}
          </div>
          <button
            onClick={create}
            disabled={saving}
            className="w-full rounded-lg bg-[#F26B1D] hover:bg-[#d95c14] disabled:opacity-60 text-white text-sm font-semibold py-2 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={15} className="animate-spin" />} สร้างบัญชีผ่อนดาวน์
          </button>
        </>
      )}
    </div>
  );
}
