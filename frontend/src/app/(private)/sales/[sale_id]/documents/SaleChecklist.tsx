"use client";

// SaleChecklist.tsx
// วางไฟล์นี้ใน: src/app/(private)/sales/[sale_id]/documents/SaleChecklist.tsx (โฟลเดอร์เดียวกับ DocumentSelection.tsx)

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Check, Lock, X } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ✅ รายการเช็คมาจาก backend (OrderViewSet.SALE_CHECKLIST_ITEMS) - จะเพิ่ม/ลดข้อ แก้ที่ backend ที่เดียว
interface ChecklistItem {
  key: string;
  label: string;
  optional?: boolean;
}
interface ChecklistMark {
  item_key: string;
  value: "done" | "na";
  checked_by: string;
  checked_at: string;
}
interface ChecklistData {
  items: ChecklistItem[];
  marks: ChecklistMark[];
  missing: string[];
  finished: { checked_by: string; checked_at: string } | null;
}

const timeTH = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";

/**
 * เช็คลิสต์หลังขาย (หน้า documents)
 * - ทุกคนติ๊กได้ / เอาติ๊กออกได้เฉพาะ adm / ผู้ตรวจสอบ (mon) ดูอย่างเดียว
 * - "จบรายการ" กดได้แม้ยังไม่ครบ แต่ข้อที่ขาดจะไปขึ้นในหมายเหตุของรายการขาย
 */
export default function SaleChecklist({ orderId }: { orderId: number }) {
  const { data: session } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const role = String((session as any)?.user?.role ?? "").toLowerCase();
  const isAdmin = role === "adm";
  const readOnly = role === "mon";

  const [data, setData] = useState<ChecklistData | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const call = useCallback(
    async (method: "GET" | "POST" | "DELETE", path: string, body?: object) => {
      const res = await fetch(`${API_BASE_URL}/order/${orderId}/${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || json?.detail || `ทำรายการไม่สำเร็จ (${res.status})`);
      return json as ChecklistData;
    },
    [orderId, token]
  );

  useEffect(() => {
    if (!token) return;
    call("GET", "checklist/")
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, [token, call]);

  const run = async (key: string, fn: () => Promise<ChecklistData>) => {
    if (busyKey) return;
    setBusyKey(key);
    try {
      setData(await fn());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusyKey(null);
    }
  };

  const mark = (key: string, value: "done" | "na") =>
    run(key, () => call("POST", "checklist/", { item_key: key, value }));
  const unmark = (key: string) =>
    run(key, () => call("DELETE", `checklist/?item_key=${encodeURIComponent(key)}`));
  const finish = () =>
    run("_finish", async () => {
      const d = await call("POST", "checklist_finish/");
      toast.success(d.missing.length ? "จบรายการแล้ว (ข้อที่ขาดอยู่ในหมายเหตุ)" : "จบรายการแล้ว เช็คครบทุกข้อ");
      return d;
    });

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500">
        กำลังโหลดเช็คลิสต์...
      </div>
    );
  }

  const byKey = new Map(data.marks.map((m) => [m.item_key, m]));
  const total = data.items.length;
  const doneCount = total - data.missing.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden font-medium text-slate-900 shadow-lg">
      {/* หัวการ์ด */}
      <div className="relative overflow-hidden bg-[#1e2432] text-white px-4 py-3">
        <div className="absolute top-0 bottom-0 -right-6 w-16 bg-orange-500 -skew-x-[18deg]" />
        <div className="relative flex items-center justify-between pr-10">
          <p className="text-lg font-bold">เช็คลิสต์หลังขาย</p>
          <p className="text-sm">
            <b className="text-orange-400 text-xl">{doneCount}</b> / {total}
          </p>
        </div>
        <div className="relative mt-2 h-2 rounded-full bg-white/15 mr-10">
          <div className="h-2 rounded-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* รายการ */}
      <ul>
        {data.items.map((item, idx) => {
          const m = byKey.get(item.key);
          // ติ๊กแล้ว: adm กดเอาออกได้ / คนอื่นล็อก / mon ดูอย่างเดียว
          const locked = readOnly || (!!m && !isAdmin);
          const busy = busyKey === item.key;
          return (
            <li key={item.key} className="flex items-center gap-3 px-4 py-3 border-t border-slate-100">
              <button
                type="button"
                disabled={locked || !!busyKey}
                onClick={() => (m ? unmark(item.key) : mark(item.key, "done"))}
                className={`w-9 h-9 shrink-0 rounded-xl border-2 grid place-items-center transition-colors ${
                  busy ? "opacity-50 " : ""
                }${
                  m?.value === "done"
                    ? "bg-orange-500 border-orange-500 text-white"
                    : m?.value === "na"
                    ? "bg-slate-200 border-slate-200 text-slate-600"
                    : "bg-white border-slate-300 text-transparent hover:border-orange-400"
                }`}
                title={m ? (isAdmin ? "เอาติ๊กออก (adm)" : "ติ๊กแล้ว") : "ติ๊ก"}
              >
                {m?.value === "na" ? <X size={18} /> : <Check size={20} strokeWidth={3} />}
              </button>

              <div
                className={`flex-1 min-w-0 ${!m && !readOnly ? "cursor-pointer" : ""}`}
                onClick={() => !m && !readOnly && !busyKey && mark(item.key, "done")}
              >
                <p className={`text-[15px] leading-snug ${m ? "text-slate-500" : ""}`}>
                  <span className="text-slate-400 mr-1">{idx + 1}.</span>
                  {item.label}
                  {item.optional && <span className="text-slate-400"> (ถ้ามี)</span>}
                  {m?.value === "na" && (
                    <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">ไม่มี</span>
                  )}
                </p>
                {m && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    {!isAdmin && <Lock size={11} />}
                    {m.checked_by} · {timeTH(m.checked_at)}
                  </p>
                )}
              </div>

              {item.optional && !m && !readOnly && (
                <button
                  type="button"
                  disabled={!!busyKey}
                  onClick={() => mark(item.key, "na")}
                  className="shrink-0 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  ไม่มี
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* จบรายการ */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
        {data.finished ? (
          <p className="text-center text-sm text-slate-600">
            จบรายการแล้ว · {data.finished.checked_by} {timeTH(data.finished.checked_at)}
            {data.missing.length > 0 && (
              <span className="block text-orange-600">ยังขาด {data.missing.length} ข้อ (อยู่ในหมายเหตุ) ติ๊กเพิ่มได้</span>
            )}
          </p>
        ) : readOnly ? (
          <p className="text-center text-sm text-slate-500">ยังไม่จบรายการ</p>
        ) : (
          <button
            type="button"
            disabled={!!busyKey}
            onClick={() => (data.missing.length ? setConfirmOpen(true) : finish())}
            className="w-full rounded-xl py-3 text-base font-semibold bg-orange-500 hover:bg-orange-600 disabled:bg-slate-400 text-white"
          >
            {busyKey === "_finish" ? "กำลังบันทึก..." : "จบรายการ"}
          </button>
        )}
      </div>

      {/* ยืนยันจบทั้งที่ยังไม่ครบ */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4" onClick={() => setConfirmOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold mb-1">ยังเช็คไม่ครบ {data.missing.length} ข้อ</p>
            <p className="text-sm text-slate-600 mb-2">จะบันทึกลงหมายเหตุของรายการขายว่า</p>
            <div className="text-sm bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mb-4">
              <b>เช็คลิสต์ขาด:</b> {data.missing.join(", ")}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700"
              >
                กลับไปเช็ค
              </button>
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  finish();
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#1e2432] text-white font-semibold"
              >
                จบรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}