"use client";
// TaskLoginNotification.tsx
// วางไฟล์นี้ใน: frontend/src/components/global/TaskLoginNotification.tsx
/**
 * ✅ เช็คอินงานประจำวัน (แทน popup แจ้งเตือนงานเดิม)
 * - พนักงานที่มีงานค้าง: ครั้งแรกของวันที่เปิด POS จะขึ้นหน้าต่างเต็มจอ ต้องอัปเดตครบทุกงานก่อนใช้งาน
 *   (ยังไม่เริ่ม / กำลังทำ + ทำเพิ่มวันนี้ / ติดปัญหา + บอกว่าติดอะไร / เสร็จ)
 * - วันละครั้ง (เช็คที่ backend ตามวันที่ไทย) - เช็คอินแล้ววันนั้นไม่เด้งอีก
 * - adm / ผู้ตรวจสอบ ไม่ต้องเช็คอิน
 * - โหลดไม่ได้ / backend ยังไม่พร้อม → ไม่บล็อก (ไม่ให้ร้านขายของไม่ได้เพราะระบบงาน)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Status = "pending" | "in_progress" | "issue" | "done";

interface CheckinTask {
  assignment_id: number;
  content: string;
  created_by: string;
  status: Status;
  note: string;
  due_date: string | null;
  is_overdue: boolean;
  target_quantity: number | null;
  target_unit: string;
  current_progress: number;
}

interface Answer {
  status: Status | null;
  note: string;
  add: string;
}

const STATUS_BTNS: { key: Status; icon: string; label: string; on: string }[] = [
  { key: "pending", icon: "⏸", label: "ยังไม่เริ่ม", on: "border-gray-500 bg-gray-100 text-gray-800" },
  { key: "in_progress", icon: "🔨", label: "กำลังทำ", on: "border-blue-600 bg-blue-50 text-blue-700" },
  { key: "issue", icon: "⚠️", label: "ติดปัญหา", on: "border-red-600 bg-red-50 text-red-700" },
  { key: "done", icon: "✅", label: "เสร็จ", on: "border-green-600 bg-green-50 text-green-700" },
];

const dueText = (t: CheckinTask) => {
  if (!t.due_date) return "ไม่มีกำหนด";
  const d = new Date(t.due_date);
  const days = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (t.is_overdue) return days > 0 ? `เลยกำหนด ${days} วัน` : "เลยกำหนดแล้ว";
  if (days === 0) return "ภายในวันนี้";
  if (days === -1) return "พรุ่งนี้";
  return `กำหนด ${d.toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`;
};

const TaskLoginNotification = () => {
  const { data: session, status } = useSession();
  const token = (session as any)?.user?.accessToken as string | undefined;
  const role = String((session as any)?.user?.role || "").toLowerCase();
  const exempt = role === "adm" || role === "mon";

  const [tasks, setTasks] = useState<CheckinTask[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (status !== "authenticated" || !token || exempt) return;
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/posts/checkin/`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return; // ไม่บล็อกถ้าโหลดไม่ได้
      const d = await res.json();
      if (!d?.required) {
        setOpen(false);
        return;
      }
      const list: CheckinTask[] = Array.isArray(d.tasks) ? d.tasks : [];
      setTasks(list);
      setAnswers((prev) => {
        const next: Record<number, Answer> = {};
        list.forEach((t) => {
          next[t.assignment_id] = prev[t.assignment_id] || { status: null, note: "", add: "" };
        });
        return next;
      });
      setOpen(list.length > 0);
    } catch {
      /* ไม่บล็อก */
    }
  }, [status, token, exempt]);

  // เปิด POS + กลับมาที่แท็บ (เผื่อเปิดค้างข้ามวัน)
  useEffect(() => {
    load();
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  const isReady = (a?: Answer) => !!a?.status && !(a.status === "issue" && !a.note.trim());
  const doneCount = useMemo(
    () => (tasks || []).filter((t) => isReady(answers[t.assignment_id])).length,
    [tasks, answers]
  );
  const total = tasks?.length || 0;
  const allReady = total > 0 && doneCount === total;

  const setAns = (id: number, patch: Partial<Answer>) =>
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const submit = async () => {
    if (!allReady || saving || !tasks) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/tasks/posts/checkin/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          items: tasks.map((t) => {
            const a = answers[t.assignment_id];
            return {
              assignment_id: t.assignment_id,
              status: a.status,
              note: a.note.trim(),
              add: a.status === "in_progress" && t.target_quantity ? Number(a.add) || 0 : 0,
            };
          }),
        }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(d?.error || "เช็คอินไม่สำเร็จ");
        if (d?.missing) load(); // มีงานใหม่เข้ามาระหว่างนั้น → โหลดใหม่
        return;
      }
      toast.success("เช็คอินงานแล้ว · ใช้งาน POS ได้");
      setOpen(false);
    } catch {
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !tasks || exempt) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-title"
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto"
      >
        <div className="bg-[#1e2432] text-white px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="checkin-title" className="text-xl font-bold">☀️ งานของคุณวันนี้</h2>
            <p className="text-xs text-slate-300 font-normal">อัปเดตทุกงานก่อนเริ่มใช้งาน POS (วันละครั้ง)</p>
          </div>
          <span className="text-sm font-bold bg-white/10 rounded-full px-3 py-1 whitespace-nowrap">
            {doneCount}/{total}
          </span>
        </div>
        <div className="h-1.5 bg-slate-200">
          <div className="h-full bg-[#F26B1D] transition-all" style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} />
        </div>

        <div className="p-3 space-y-3 max-h-[65vh] overflow-y-auto">
          {tasks.map((t) => {
            const a = answers[t.assignment_id] || { status: null, note: "", add: "" };
            return (
              <div
                key={t.assignment_id}
                className={`rounded-xl border-2 p-3 ${
                  a.status === "done" ? "border-green-600 bg-green-50" : t.is_overdue ? "border-red-500" : "border-slate-200"
                }`}
              >
                <div className="flex justify-between gap-2 items-start">
                  <div className="min-w-0">
                    <p className="font-bold text-base whitespace-pre-wrap break-words">{t.content}</p>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">
                      <span className={t.is_overdue ? "text-red-600 font-bold" : ""}>⏰ {dueText(t)}</span>
                      {t.target_quantity ? ` · ${t.current_progress}/${t.target_quantity} ${t.target_unit}` : ""}
                      {t.created_by ? ` · สั่งโดย ${t.created_by}` : ""}
                    </p>
                  </div>
                  {t.is_overdue && (
                    <span className="text-[11px] font-bold rounded-full px-2 py-0.5 bg-red-100 text-red-700 whitespace-nowrap">
                      เลยกำหนด
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  {STATUS_BTNS.map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      aria-pressed={a.status === b.key}
                      onClick={() => setAns(t.assignment_id, { status: b.key })}
                      className={`rounded-xl border-2 py-2.5 flex flex-col items-center text-sm font-bold transition-colors ${
                        a.status === b.key ? b.on : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xl leading-none mb-0.5">{b.icon}</span>
                      {b.label}
                    </button>
                  ))}
                </div>

                {a.status === "in_progress" && t.target_quantity ? (
                  <div className="flex items-center gap-2 mt-2 text-sm font-normal">
                    <span className="text-slate-500">วันนี้ทำเพิ่ม</span>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={a.add}
                      onChange={(e) => setAns(t.assignment_id, { add: e.target.value })}
                      className="w-24 text-right border-2 rounded-lg px-2 py-1.5 outline-none focus:border-orange-400"
                      placeholder="0"
                      aria-label="จำนวนที่ทำเพิ่มวันนี้"
                    />
                    <span className="text-slate-500">{t.target_unit}</span>
                  </div>
                ) : null}

                {a.status === "issue" && (
                  <input
                    autoFocus
                    value={a.note}
                    onChange={(e) => setAns(t.assignment_id, { note: e.target.value })}
                    placeholder="ติดอะไร? (ต้องกรอก)"
                    aria-label="ติดปัญหาอะไร"
                    className={`w-full mt-2 border-2 rounded-lg px-3 py-2 text-sm font-normal outline-none ${
                      a.note.trim() ? "border-slate-200 focus:border-orange-400" : "border-red-300 focus:border-red-500"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t">
          <button
            type="button"
            onClick={submit}
            disabled={!allReady || saving}
            className="w-full rounded-xl py-3 text-base font-bold text-white bg-[#F26B1D] hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {saving ? "กำลังบันทึก..." : allReady ? "เข้าใช้งาน POS →" : `อัปเดตอีก ${total - doneCount} งาน`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskLoginNotification;