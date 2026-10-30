"use client";
// DailyCloseBar.tsx
// วางไฟล์นี้ใน: frontend/src/components/global/DailyCloseBar.tsx
/**
 * ✅ แถบปิดร้าน + Note ปิดร้านประจำวัน (พนักงาน - adm / ผู้ตรวจสอบ ไม่ต้องทำ)
 * - ขึ้นแถบติดล่างจอตั้งแต่เวลาเริ่มเก็บร้าน จนกว่าจะส่ง note: 1) ส่งเงิน 2) รายรับ-รายจ่าย 3) note ปิดร้าน
 * - 10 นาทีสุดท้ายก่อนปิดร้าน แถบเป็นสีแดง
 * - เขียน note ได้เมื่อไม่มีเงินสดค้างส่ง (ระบบเช็คให้) + ติ๊กเช็คลิสต์ครบ + เขียน "วันนี้เกิดอะไรขึ้น"
 * - backend ยังไม่พร้อม / โหลดไม่ได้ → ไม่แสดงอะไร
 */
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ✅ เวลาร้าน (นาทีของวัน) - อาทิตย์ปิด 17:00 / วันอื่นปิด 17:15 · เริ่มเก็บร้านก่อนปิด 45 นาที
const SHOP_HOURS = {
  weekday: { start: 16 * 60 + 30, close: 17 * 60 + 15 },
  sunday: { start: 16 * 60 + 15, close: 17 * 60 },
};
const URGENT_MINUTES = 10;
const QUICK = ["ลูกค้าเยอะ", "ขายได้ดี", "เงียบ", "ของหมด", "ลูกค้าร้องเรียน"];

interface NoteState {
  enabled: boolean;
  exempt?: boolean;
  checklist?: { key: string; label: string }[];
  unsent_count?: number;
  unsent_amount?: number;
  note?: { today: string; issue: string; tomorrow: string } | null;
}

const bkkNow = () => {
  // เวลาไทยเสมอ ไม่ว่าเครื่องตั้ง timezone อะไรไว้ (ใช้ formatToParts - ไม่พึ่งรูปแบบข้อความที่แต่ละเครื่องต่างกัน)
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      hour12: false,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
    const h = Number(get("hour")) || 0;
    const m = Number(get("minute")) || 0;
    return { sunday: get("weekday") === "Sun", minutes: (h % 24) * 60 + m };
  } catch {
    return { sunday: false, minutes: 0 }; // อ่านเวลาไม่ได้ → ไม่โชว์แถบ (ไม่ให้หน้าพัง)
  }
};
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const baht = (n: number) => Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });

const DailyCloseBar = () => {
  const { data: session, status } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const role = String((session as any)?.user?.role || "").toLowerCase();
  const exemptRole = role === "adm" || role === "mon";

  const [clock, setClock] = useState(bkkNow());
  const [st, setSt] = useState<NoteState | null>(null);
  const [open, setOpen] = useState(false);
  const [chk, setChk] = useState<Record<string, boolean>>({});
  const [today, setToday] = useState("");
  const [issue, setIssue] = useState("");
  const [tomorrow, setTomorrow] = useState("");
  const [saving, setSaving] = useState(false);

  const hours = clock.sunday ? SHOP_HOURS.sunday : SHOP_HOURS.weekday;
  const inWindow = clock.minutes >= hours.start;

  useEffect(() => {
    const t = setInterval(() => setClock(bkkNow()), 30_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    if (status !== "authenticated" || !token || exemptRole) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/posts/daily_note/`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      setSt(await res.json());
    } catch {
      /* ไม่แสดงอะไร */
    }
  }, [status, token, exemptRole]);

  // ✅ โหลดตอนเข้าช่วงปิดร้าน + ทุก 2 นาที (อัปเดตยอดค้างส่งหลังกดส่งเงิน) + ตอนกลับมาที่แท็บ
  useEffect(() => {
    if (!inWindow) return;
    load();
    const t = setInterval(load, 120_000);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [inWindow, load]);

  if (exemptRole || !inWindow || !st?.enabled || st.exempt || st.note) return null;

  const sent = (st.unsent_count || 0) === 0;
  const left = hours.close - clock.minutes;
  const urgent = left <= URGENT_MINUTES;
  const list = st.checklist || [];
  const ready = list.every((c) => chk[c.key]) && today.trim() !== "";

  const openNote = () => {
    if (!sent) {
      toast.error(`ส่งเงินสดค้างส่ง ${baht(st.unsent_amount || 0)} บาท ก่อน`);
      return;
    }
    load();
    setOpen(true);
  };

  const submit = async () => {
    if (!ready || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/posts/daily_note/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ checklist: chk, today, issue, tomorrow }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(d?.error || "ส่ง note ไม่สำเร็จ");
        load();
        return;
      }
      toast.success("ส่ง note ปิดร้านแล้ว · ขอบคุณครับ");
      setOpen(false);
      setSt((prev) => (prev ? { ...prev, note: d.note } : prev));
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  const stepCls = (ok: boolean) =>
    `text-sm font-bold rounded-full px-3 py-1.5 border-2 whitespace-nowrap ${
      ok ? "border-green-600 bg-green-50 text-green-700" : "border-orange-400 bg-white text-orange-700"
    }`;

  return (
    <>
      <div
        className={`fixed bottom-0 inset-x-0 z-[90] border-t-4 shadow-[0_-6px_20px_rgba(0,0,0,0.12)] ${
          urgent ? "border-red-600 bg-red-50" : "border-[#F26B1D] bg-white"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-bold">
              {left > 0
                ? urgent
                  ? `⏰ อีก ${left} นาทีปิดร้าน!`
                  : `🔔 ใกล้ปิดร้าน (${hhmm(hours.close)})`
                : "⏰ เลยเวลาปิดร้านแล้ว"}
            </p>
            <p className="text-xs text-gray-500 font-normal">ทำ 3 อย่างนี้ก่อนกลับบ้าน</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/cashflow" className={stepCls(sent)}>
              {sent ? "✅ ส่งเงินแล้ว" : `1️⃣ ส่งเงิน ${baht(st.unsent_amount || 0)}฿`}
            </Link>
            <Link href="/cashflow" className={stepCls(false)}>
              2️⃣ รายรับ-รายจ่าย
            </Link>
            <button type="button" onClick={openNote} className={stepCls(false)}>
              3️⃣ note ปิดร้าน
            </button>
          </div>
          <button
            type="button"
            onClick={openNote}
            disabled={!sent}
            className="rounded-xl px-5 py-2.5 font-bold text-white bg-[#F26B1D] hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-500"
          >
            {sent ? "📝 เขียน note ปิดร้าน" : "🔒 ส่งเงินก่อน"}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[95] bg-slate-900/60 flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
          <div role="dialog" aria-modal="true" aria-labelledby="dn-title" className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-auto">
            <div className="bg-[#1e2432] text-white px-5 py-4 flex items-center justify-between">
              <h2 id="dn-title" className="text-lg font-bold">📝 Note ปิดร้าน · วันนี้</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-300 hover:text-white text-xl" aria-label="ปิด">
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <h3 className="font-bold mb-2">✅ เช็คลิสต์ปิดร้าน</h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 rounded-xl border-2 border-green-600 bg-green-50 px-3 py-2 text-sm">
                    <span className="w-5 h-5 rounded bg-green-600 text-white grid place-items-center text-xs">✓</span>
                    📤 ส่งเงินแล้ว
                    <span className="ml-auto text-[11px] text-gray-500 font-normal">ระบบเช็คให้</span>
                  </div>
                  {list.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      aria-pressed={!!chk[c.key]}
                      onClick={() => setChk((p) => ({ ...p, [c.key]: !p[c.key] }))}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm text-left ${
                        chk[c.key] ? "border-green-600 bg-green-50" : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded border-2 grid place-items-center text-xs shrink-0 ${
                          chk[c.key] ? "bg-green-600 border-green-600 text-white" : "border-gray-300 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-1">
                  📝 วันนี้เกิดอะไรขึ้น <span className="text-xs text-red-600 font-normal">*ต้องกรอก</span>
                </h3>
                <textarea
                  value={today}
                  onChange={(e) => setToday(e.target.value)}
                  rows={3}
                  placeholder="เช่น ขายได้ 2 คัน ลูกค้าเข้าซ่อมเยอะช่วงบ่าย"
                  className={`w-full border-2 rounded-xl px-3 py-2 text-sm font-normal outline-none ${
                    today.trim() ? "border-gray-200 focus:border-orange-400" : "border-red-300 focus:border-red-500"
                  }`}
                />
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setToday((p) => (p.trim() ? `${p.trim()} · ${q}` : q))}
                      className="text-xs font-normal border border-dashed rounded-full px-2.5 py-0.5 text-gray-500 hover:bg-gray-50"
                    >
                      + {q}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-1">⚠️ ปัญหา / เรื่องผิดปกติ</h3>
                <textarea
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  rows={2}
                  placeholder="ถ้าไม่มี เว้นว่างได้"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-normal outline-none focus:border-orange-400"
                />
              </div>

              <div>
                <h3 className="font-bold mb-1">📌 ฝากงานพรุ่งนี้</h3>
                <textarea
                  value={tomorrow}
                  onChange={(e) => setTomorrow(e.target.value)}
                  rows={2}
                  placeholder="เช่น โทรตามลูกค้า O-123 เรื่องเอกสาร"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-normal outline-none focus:border-orange-400"
                />
              </div>
            </div>

            <div className="p-4 border-t">
              <button
                type="button"
                onClick={submit}
                disabled={!ready || saving}
                className="w-full rounded-xl py-3 font-bold text-white bg-[#F26B1D] hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-500"
              >
                {saving ? "กำลังส่ง..." : ready ? "ส่ง note · ปิดร้าน ✅" : "ติ๊กเช็คลิสต์ + เขียนวันนี้ก่อน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DailyCloseBar;