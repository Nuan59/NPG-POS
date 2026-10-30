"use client";
// DailyNotesAdmin.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/tasks/components/DailyNotesAdmin.tsx
/**
 * ✅ Note ปิดร้าน (เฉพาะ adm / ผู้ตรวจสอบ) - ดูของทุกคนรายวัน ย้อนหลังได้
 * ใครส่งแล้ว (กี่โมง / ส่งช้าไหม) / ใครยังไม่ส่ง / วันนี้ / ปัญหา / ฝากงานพรุ่งนี้
 */
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const CLOSE = { weekday: 17 * 60 + 15, sunday: 17 * 60 }; // ส่งหลังเวลาปิดร้าน = ส่งช้า

interface Note {
  date: string;
  checklist: Record<string, boolean>;
  today: string;
  issue: string;
  tomorrow: string;
  created_at: string;
  updated_at: string;
}
interface Person {
  user_id: number;
  name: string;
  note: Note | null;
}

const todayBkk = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
const shiftDate = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
};
const timeBkk = (iso: string) =>
  new Date(iso).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
const minutesBkk = (iso: string) => {
  const [h, m] = new Date(iso)
    .toLocaleTimeString("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false })
    .split(":")
    .map(Number);
  return h * 60 + m;
};

const DailyNotesAdmin = () => {
  const { data: session, status } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const role = String((session as any)?.user?.role || "").toLowerCase();
  const allowed = role === "adm" || role === "mon";

  const [date, setDate] = useState(todayBkk());
  const [people, setPeople] = useState<Person[] | null>(null);
  const [checklist, setChecklist] = useState<{ key: string; label: string }[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated" || !token || !allowed) return;
    setPeople(null);
    setError("");
    fetch(`${API_BASE_URL}/tasks/posts/daily_note_list/?date=${date}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.error || "โหลดไม่สำเร็จ");
        setPeople(Array.isArray(d?.people) ? d.people : []);
        setChecklist(Array.isArray(d?.checklist) ? d.checklist : []);
      })
      .catch((e) => setError(String(e.message || e)));
  }, [status, token, allowed, date]);

  if (!allowed) return null;

  const isSunday = new Date(`${date}T12:00:00`).getDay() === 0;
  const closeMin = isSunday ? CLOSE.sunday : CLOSE.weekday;
  const isToday = date === todayBkk();
  const sentCount = (people || []).filter((p) => p.note).length;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-lg font-bold text-gray-800">
          📝 Note ปิดร้าน
          {people && (
            <span className="text-sm font-normal text-gray-500">
              {" "}
              · ส่งแล้ว {sentCount}/{people.length}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setDate(shiftDate(date, -1))} className="border rounded-lg px-2.5 py-1 text-sm bg-white hover:bg-gray-50" aria-label="วันก่อนหน้า">
            ‹
          </button>
          <input
            type="date"
            value={date}
            max={todayBkk()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="border rounded-lg px-2 py-1 text-sm bg-white font-normal"
            aria-label="เลือกวันที่"
          />
          <button
            type="button"
            onClick={() => setDate(shiftDate(date, 1))}
            disabled={isToday}
            className="border rounded-lg px-2.5 py-1 text-sm bg-white hover:bg-gray-50 disabled:opacity-40"
            aria-label="วันถัดไป"
          >
            ›
          </button>
          {!isToday && (
            <button type="button" onClick={() => setDate(todayBkk())} className="text-xs text-orange-600 underline ml-1">
              วันนี้
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600 font-normal border border-red-200 bg-red-50 rounded-lg p-3">{error}</p>
      ) : people === null ? (
        <p className="text-sm text-gray-400 font-normal">กำลังโหลด...</p>
      ) : people.length === 0 ? (
        <p className="text-sm text-gray-500 font-normal border rounded-lg p-3 bg-white">ไม่มีพนักงาน</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => {
            const n = p.note;
            const late = n ? minutesBkk(n.created_at) > closeMin || n.created_at.slice(0, 10) > date : false;
            return (
              <div key={p.user_id} className={`bg-white border rounded-xl overflow-hidden ${n ? "" : "border-dashed opacity-80"}`}>
                <div className="flex items-center gap-2 px-3 py-2.5 border-b">
                  <div className="w-8 h-8 rounded-full bg-[#1e2432] text-white grid place-items-center text-sm font-bold shrink-0">
                    {p.name.slice(0, 1)}
                  </div>
                  <span className="font-bold flex-1 min-w-0 truncate">{p.name}</span>
                  {n ? (
                    <span
                      className={`text-xs font-bold rounded-full px-2 py-0.5 ${
                        late ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                      }`}
                    >
                      {late ? "⏰ ส่งช้า " : "✅ "}
                      {timeBkk(n.created_at)}
                    </span>
                  ) : (
                    <span className="text-xs font-bold rounded-full px-2 py-0.5 bg-red-50 text-red-700">⛔ ยังไม่ส่ง</span>
                  )}
                </div>
                {n ? (
                  <div className="px-3 py-2.5 space-y-2 text-sm font-normal">
                    <div className="flex flex-wrap gap-1">
                      {checklist.map((c) => (
                        <span
                          key={c.key}
                          className={`text-[11px] rounded-md px-1.5 py-0.5 ${
                            n.checklist?.[c.key] ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {n.checklist?.[c.key] ? "✓" : "✗"} {c.label.replace(/^\S+\s/, "")}
                        </span>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500">📝 วันนี้</p>
                      <p className="whitespace-pre-wrap break-words">{n.today}</p>
                    </div>
                    {n.issue && (
                      <div className="text-red-700">
                        <p className="text-xs font-bold">⚠️ ปัญหา</p>
                        <p className="whitespace-pre-wrap break-words">{n.issue}</p>
                      </div>
                    )}
                    {n.tomorrow && (
                      <div>
                        <p className="text-xs font-bold text-gray-500">📌 ฝากพรุ่งนี้</p>
                        <p className="whitespace-pre-wrap break-words">{n.tomorrow}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="px-3 py-2.5 text-sm text-gray-400 font-normal">ยังไม่ได้เขียน note ปิดร้าน</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DailyNotesAdmin;