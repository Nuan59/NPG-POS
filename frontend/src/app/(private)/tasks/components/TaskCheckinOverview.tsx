"use client";
// TaskCheckinOverview.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/tasks/components/TaskCheckinOverview.tsx
/**
 * ✅ ภาพรวมเช็คอินงานวันนี้ (เฉพาะ adm / ผู้ตรวจสอบ)
 * - ใครเช็คอินแล้ว / ยังไม่เช็คอิน
 * - งานค้างของแต่ละคน + สถานะ + อัปเดตล่าสุดเมื่อไหร่ (เกิน 2 วันขึ้นแดง) + ติดปัญหาอะไร
 */
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Status = "pending" | "in_progress" | "issue" | "done";

interface OvTask {
  assignment_id: number;
  content: string;
  status: Status;
  note: string;
  due_date: string | null;
  is_overdue: boolean;
  target_quantity: number | null;
  target_unit: string;
  current_progress: number;
  last_update_at: string | null;
}
interface OvPerson {
  user_id: number;
  name: string;
  checked_today: boolean;
  tasks: OvTask[];
}

const ST: Record<Status, { label: string; cls: string }> = {
  pending: { label: "⏸ ยังไม่เริ่ม", cls: "bg-slate-100 text-slate-600" },
  in_progress: { label: "🔨 กำลังทำ", cls: "bg-blue-50 text-blue-700" },
  issue: { label: "⚠️ ติดปัญหา", cls: "bg-red-50 text-red-700" },
  done: { label: "✅ เสร็จ", cls: "bg-green-50 text-green-700" },
};

const STALE_DAYS = 2;
const daysAgo = (iso: string | null) =>
  iso ? Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000) : null;
const agoText = (d: number | null) => (d === null ? "ไม่เคยอัปเดต" : d <= 0 ? "วันนี้" : d === 1 ? "เมื่อวาน" : `${d} วันก่อน`);

const TaskCheckinOverview = () => {
  const { data: session, status } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const role = String((session as any)?.user?.role || "").toLowerCase();
  const allowed = role === "adm" || role === "mon";
  const [people, setPeople] = useState<OvPerson[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status !== "authenticated" || !token || !allowed) return;
    fetch(`${API_BASE_URL}/tasks/posts/checkin_overview/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) throw new Error(d?.error || "โหลดไม่สำเร็จ");
        setPeople(Array.isArray(d?.people) ? d.people : []);
      })
      .catch((e) => setError(String(e.message || e)));
  }, [status, token, allowed]);

  if (!allowed) return null;

  const list = people || [];
  const withTasks = list.filter((p) => p.tasks.length > 0);
  const all = withTasks.flatMap((p) => p.tasks);
  const kpis = [
    { v: `${withTasks.filter((p) => p.checked_today).length}/${withTasks.length}`, l: "เช็คอินแล้ววันนี้", c: "text-green-700" },
    { v: withTasks.filter((p) => !p.checked_today).length, l: "ยังไม่เช็คอิน", c: "text-amber-600" },
    { v: all.filter((t) => t.status === "issue").length, l: "งานติดปัญหา", c: "text-red-600" },
    {
      v: all.filter((t) => {
        const d = daysAgo(t.last_update_at);
        return d === null || d > STALE_DAYS;
      }).length,
      l: `ไม่อัปเดต > ${STALE_DAYS} วัน`,
      c: "text-red-600",
    },
  ];

  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-800 mb-2">📋 เช็คอินงานวันนี้</h3>
      {error ? (
        <p className="text-sm text-red-600 font-normal border border-red-200 bg-red-50 rounded-lg p-3">{error}</p>
      ) : people === null ? (
        <p className="text-sm text-gray-400 font-normal">กำลังโหลด...</p>
      ) : withTasks.length === 0 ? (
        <p className="text-sm text-gray-500 font-normal border rounded-lg p-3 bg-white">ไม่มีพนักงานที่มีงานค้าง</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {kpis.map((k) => (
              <div key={k.l} className="bg-white border rounded-xl p-3">
                <div className={`text-2xl font-bold leading-tight ${k.c}`}>{k.v}</div>
                <div className="text-xs text-gray-500 font-normal">{k.l}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {withTasks.map((p) => (
              <div key={p.user_id} className="bg-white border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 border-b">
                  <div className="w-8 h-8 rounded-full bg-[#1e2432] text-white grid place-items-center text-sm font-bold shrink-0">
                    {p.name.slice(0, 1)}
                  </div>
                  <span className="font-bold flex-1 min-w-0 truncate">{p.name}</span>
                  {p.checked_today ? (
                    <span className="text-xs font-bold rounded-full px-2 py-0.5 bg-green-50 text-green-700">✅ เช็คอินแล้ว</span>
                  ) : (
                    <span className="text-xs font-bold rounded-full px-2 py-0.5 bg-amber-50 text-amber-700">⛔ ยังไม่เช็คอิน</span>
                  )}
                </div>
                {p.tasks.map((t) => {
                  const d = daysAgo(t.last_update_at);
                  const stale = d === null || d > STALE_DAYS;
                  return (
                    <div key={t.assignment_id} className="px-3 py-2 border-b border-dashed last:border-b-0">
                      <div className="flex justify-between gap-2 items-start">
                        <div className="min-w-0">
                          <p className="text-sm font-medium break-words">{t.content}</p>
                          <p className="text-xs font-normal mt-0.5">
                            <span className={stale ? "text-red-600 font-bold" : "text-gray-400"}>🕒 {agoText(d)}</span>
                            {t.is_overdue && <span className="text-red-600 font-bold"> · เลยกำหนด</span>}
                            {t.target_quantity ? (
                              <span className="text-gray-400">
                                {" "}
                                · {t.current_progress}/{t.target_quantity} {t.target_unit}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <span className={`text-xs font-bold rounded-md px-2 py-0.5 whitespace-nowrap ${ST[t.status].cls}`}>
                          {ST[t.status].label}
                        </span>
                      </div>
                      {t.status === "issue" && t.note && (
                        <p className="text-xs text-red-600 font-normal mt-1">⚠️ {t.note}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TaskCheckinOverview;