"use client";
// TaskCalendar.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/tasks/components/TaskCalendar.tsx
// ปฏิทินงาน + เวร: ดึงจากงานที่มอบหมายอยู่แล้ว (ไม่ต้องกรอกซ้ำ)
// - เวร = โพสต์ที่ขึ้นต้นด้วย "[เวร] " (ลงจากปุ่ม "📅 เวร" ในหน้าโพสต์) → ทุกคนเห็นเวรของทุกคน
// - ทุกคน (รวม adm / ผู้ตรวจสอบ) เห็นเฉพาะงานที่มอบหมายให้ตัวเอง + ประกาศทั่วไปที่มีกำหนดวัน (งานของทุกคน)
// - ขึ้นในวันตามกำหนดส่ง (due_date) / งานที่ไม่มีกำหนดวันแสดงแยกด้านล่าง
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight, CalendarDays, Megaphone, Target, AlertTriangle, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getTaskPosts, deleteTaskPost, TaskPost } from "@/services/TaskService";

// ต้องตรงกับ DUTY_PREFIX ใน employees/components/TaskBoard.tsx
const DUTY_PREFIX = "[เวร]";
const isDutyPost = (p: { content: string }) => (p.content || "").startsWith(DUTY_PREFIX);
const dutyNameOf = (content: string) => content.slice(DUTY_PREFIX.length).trim() || "เวร";

interface DutyEntry {
  name: string;
  users: { username: string; name: string }[];
  postIds: number[];
}

type Status = "pending" | "in_progress" | "issue" | "done";

const STATUS: Record<Status, { label: string; chip: string; dot: string }> = {
  pending: { label: "ยังไม่ทำ", chip: "bg-amber-50 text-amber-700 border-amber-300", dot: "bg-amber-400" },
  in_progress: { label: "กำลังทำ", chip: "bg-blue-50 text-blue-700 border-blue-300", dot: "bg-blue-500" },
  issue: { label: "ติดปัญหา", chip: "bg-red-50 text-red-700 border-red-300", dot: "bg-red-500" },
  done: { label: "ทำแล้ว", chip: "bg-emerald-50 text-emerald-700 border-emerald-300", dot: "bg-emerald-500" },
};

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

interface CalItem {
  key: string;
  kind: "mine" | "general";
  content: string;
  createdBy: string;
  status: Status | null; // null = ประกาศทั่วไป
  note: string;
  due: Date | null;
  overdue: boolean;
  progress: { current: number; target: number; unit: string; pct: number } | null;
}

/** วันที่แบบ local (YYYY-MM-DD) ใช้เป็น key จัดกลุ่มงานตามวัน */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const TaskCalendar = () => {
  const { data: session, status } = useSession();
  const myUsername = (session?.user as any)?.username as string | undefined;

  const [posts, setPosts] = useState<TaskPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(() => dayKey(today));
  const isAdmin = String((session?.user as any)?.role ?? "").toLowerCase() === "adm";
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    getTaskPosts()
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoaded(true));
  }, [status, reloadTick]);

  // ✅ กรองฝั่งหน้าเว็บ: เหลือแค่งานของฉัน + ประกาศทั่วไปที่มีกำหนดวัน
  const items: CalItem[] = useMemo(() => {
    const out: CalItem[] = [];
    for (const p of posts) {
      if (isDutyPost(p)) continue; // เวรแสดงแยก (ทุกคนเห็น)
      if (p.post_type === "general") {
        if (!p.due_date) continue;
        out.push({
          key: `g${p.id}`,
          kind: "general",
          content: p.content,
          createdBy: p.created_by,
          status: null,
          note: "",
          due: new Date(p.due_date),
          overdue: !!p.is_overdue,
          progress: null,
        });
        continue;
      }
      for (const a of p.assignments || []) {
        if (!myUsername || a.employee_username !== myUsername) continue;
        out.push({
          key: `a${a.id}`,
          kind: "mine",
          content: p.content,
          createdBy: p.created_by,
          status: (a.status as Status) || "pending",
          note: a.note || "",
          due: a.due_date ? new Date(a.due_date) : null,
          overdue: !!a.is_overdue && a.status !== "done",
          progress: a.target_quantity
            ? {
                current: a.current_progress || 0,
                target: a.target_quantity,
                unit: a.target_unit || "",
                pct: a.progress_percentage ?? 0,
              }
            : null,
        });
      }
    }
    return out;
  }, [posts, myUsername]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const it of items) {
      if (!it.due) continue;
      const k = dayKey(it.due);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return map;
  }, [items]);

  const undated = items.filter((it) => !it.due && it.status !== "done");

  // ✅ เวรรายวัน (ทุกคนเห็น) - รวมเวรชื่อเดียวกันในวันเดียวกันเป็นแถวเดียว
  const dutyByDay = useMemo(() => {
    const map = new Map<string, DutyEntry[]>();
    for (const p of posts) {
      if (!isDutyPost(p)) continue;
      const name = dutyNameOf(p.content);
      for (const a of p.assignments || []) {
        if (!a.due_date) continue;
        const k = dayKey(new Date(a.due_date));
        if (!map.has(k)) map.set(k, []);
        const list = map.get(k)!;
        let e = list.find((x) => x.name === name);
        if (!e) {
          e = { name, users: [], postIds: [] };
          list.push(e);
        }
        if (!e.users.some((u) => u.username === a.employee_username))
          e.users.push({ username: a.employee_username, name: a.employee_name });
        if (!e.postIds.includes(p.id)) e.postIds.push(p.id);
      }
    }
    return map;
  }, [posts]);
  const isMine = (e: DutyEntry) => !!myUsername && e.users.some((u) => u.username === myUsername);
  const dutyLabel = (e: DutyEntry) => `${e.name}: ${e.users.map((u) => u.name).join(", ")}`;

  const removeDuty = async (e: DutyEntry) => {
    if (!window.confirm(`ลบเวร${e.name}ของวันนี้ใช่ไหม?`)) return;
    let failed = 0;
    for (const id of e.postIds) {
      const r = await deleteTaskPost(id);
      if (r?.status !== "success") failed += 1;
    }
    if (failed) toast.error("ลบเวรไม่สำเร็จ");
    else toast.success("ลบเวรแล้ว");
    setReloadTick((t) => t + 1);
  };

  // ตารางเดือน: เริ่มวันอาทิตย์ 6 แถว
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const monthHasWeek6 = cells[35].getMonth() === cursor.getMonth();
  const visibleCells = monthHasWeek6 ? cells : cells.slice(0, 35);

  const todayKey = dayKey(today);
  const selectedItems = byDay.get(selected) || [];
  const selectedDate = new Date(`${selected}T00:00:00`);

  const goMonth = (delta: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1));
  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(todayKey);
  };

  if (status !== "authenticated" || !loaded) return null;

  const myOpen = items.filter((i) => i.kind === "mine" && i.status !== "done").length;
  const selectedDuties = dutyByDay.get(selected) || [];

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-5 w-5 text-[#F26B1D]" />
        <h3 className="text-lg font-bold text-[#1e2432]">ปฏิทินงานและเวร</h3>
        {myOpen > 0 && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F26B1D] text-white">
            ค้าง {myOpen}
          </span>
        )}
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        {/* หัวปฏิทิน */}
        <div className="flex items-center gap-2 bg-[#1e2432] text-white px-3 py-2.5">
          <button
            type="button"
            aria-label="เดือนก่อน"
            onClick={() => goMonth(-1)}
            className="w-10 h-10 grid place-items-center rounded-xl hover:bg-white/10"
          >
            <ChevronLeft size={22} />
          </button>
          <p className="flex-1 text-center text-lg font-semibold">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear() + 543}
          </p>
          <button
            type="button"
            aria-label="เดือนถัดไป"
            onClick={() => goMonth(1)}
            className="w-10 h-10 grid place-items-center rounded-xl hover:bg-white/10"
          >
            <ChevronRight size={22} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="ml-1 text-sm font-medium px-3 h-9 rounded-xl bg-[#F26B1D] hover:bg-[#e25d10]"
          >
            วันนี้
          </button>
        </div>

        {/* ชื่อวัน */}
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-2 text-center text-xs font-semibold ${i === 0 ? "text-red-500" : "text-[#7A7A7A]"}`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* ตารางวัน */}
        <div className="grid grid-cols-7">
          {visibleCells.map((d) => {
            const k = dayKey(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const list = byDay.get(k) || [];
            const dayDuties = dutyByDay.get(k) || [];
            const isToday = k === todayKey;
            const isSel = k === selected;
            const hasOverdue = list.some((x) => x.overdue);
            return (
              <button
                type="button"
                key={k}
                onClick={() => setSelected(k)}
                className={`relative flex flex-col items-start justify-start min-h-[64px] sm:min-h-[92px] border-b border-r p-1 sm:p-1.5 text-left transition-colors ${
                  isSel ? "bg-orange-50" : "hover:bg-gray-50"
                } ${inMonth ? "" : "bg-gray-50/60"}`}
              >
                <span
                  className={`inline-grid place-items-center w-7 h-7 rounded-full text-sm font-semibold ${
                    isToday
                      ? "bg-[#F26B1D] text-white"
                      : isSel
                      ? "bg-[#1e2432] text-white"
                      : inMonth
                      ? d.getDay() === 0
                        ? "text-red-500"
                        : "text-[#1e2432]"
                      : "text-gray-300"
                  }`}
                >
                  {d.getDate()}
                </span>

                {/* เวร - มือถือ: ป้าย "เวร" เฉพาะวันที่เป็นเวรของฉัน / จอใหญ่: ชื่อเวรทุกคน (ส้ม = เวรของฉัน) */}
                {dayDuties.length > 0 && (
                  <>
                    {dayDuties.some(isMine) && (
                      <div className="mt-1 sm:hidden">
                        <span className="inline-block rounded px-1 text-[10px] font-bold leading-4 bg-[#F26B1D] text-white">เวร</span>
                      </div>
                    )}
                    <div className="hidden sm:block mt-1 space-y-0.5 w-full min-w-0">
                      {dayDuties.slice(0, 2).map((e) => (
                        <div
                          key={e.name}
                          className={`truncate rounded px-1 py-0.5 text-[11px] leading-tight font-medium text-white ${
                            isMine(e) ? "bg-[#F26B1D]" : "bg-[#1e2432]"
                          }`}
                        >
                          {dutyLabel(e)}
                        </div>
                      ))}
                      {dayDuties.length > 2 && (
                        <div className="text-[11px] text-[#7A7A7A] px-1">+{dayDuties.length - 2} เวร</div>
                      )}
                    </div>
                  </>
                )}

                {/* งาน - มือถือ: จุดสี / จอใหญ่: ชื่องานย่อ */}
                {list.length > 0 && (
                  <>
                    <div className="flex flex-wrap gap-0.5 mt-1 sm:hidden">
                      {list.slice(0, 4).map((it) => (
                        <span
                          key={it.key}
                          className={`w-2 h-2 rounded-full ${it.status ? STATUS[it.status].dot : "bg-[#1e2432]"}`}
                        />
                      ))}
                    </div>
                    <div className="hidden sm:block mt-1 space-y-0.5 w-full min-w-0">
                      {list.slice(0, 2).map((it) => (
                        <div
                          key={it.key}
                          className={`truncate rounded px-1 py-0.5 text-[11px] leading-tight border ${
                            it.status ? STATUS[it.status].chip : "bg-slate-100 text-[#1e2432] border-slate-300"
                          }`}
                        >
                          {it.content}
                        </div>
                      ))}
                      {list.length > 2 && (
                        <div className="text-[11px] text-[#7A7A7A] px-1">+{list.length - 2} งาน</div>
                      )}
                    </div>
                  </>
                )}
                {hasOverdue && (
                  <AlertTriangle size={13} className="absolute top-1.5 right-1.5 text-red-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* งานของวันที่เลือก */}
      <div className="mt-4">
        <p className="text-base font-semibold text-[#1e2432] mb-2">
          {selected === todayKey ? "วันนี้ · " : ""}
          {selectedDate.toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        {/* ✅ เวรของวันที่เลือก (ทุกคนเห็น) */}
        {selectedDuties.length > 0 && (
          <div className="mb-3 bg-white border rounded-xl divide-y">
            {selectedDuties.map((e) => {
              const mine = isMine(e);
              return (
                <div key={e.name} className={`flex items-center gap-3 px-4 py-3 ${mine ? "bg-orange-50" : ""}`}>
                  <UserCheck size={20} className={mine ? "text-[#F26B1D]" : "text-[#1e2432]"} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#7A7A7A]">เวร{e.name}</p>
                    <p className="text-base font-semibold text-[#1e2432] truncate">{e.users.map((u) => u.name).join(", ")}</p>
                  </div>
                  {mine && (
                    <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-[#F26B1D] text-white">เวรของคุณ</span>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      aria-label="ลบเวร"
                      onClick={() => removeDuty(e)}
                      className="shrink-0 p-2 rounded-lg text-[#7A7A7A] hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {selectedItems.length === 0 && selectedDuties.length === 0 ? (
          <p className="text-sm text-[#7A7A7A] bg-white border rounded-xl px-4 py-5 text-center">ไม่มีงานวันนี้</p>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((it) => (
              <TaskRow key={it.key} it={it} />
            ))}
          </div>
        )}
      </div>

      {undated.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-[#7A7A7A] mb-2">งานของฉันที่ไม่มีกำหนดวัน</p>
          <div className="space-y-2">
            {undated.map((it) => (
              <TaskRow key={it.key} it={it} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const TaskRow = ({ it }: { it: CalItem }) => (
  <div
    className={`bg-white border rounded-xl px-4 py-3 border-l-4 ${
      it.overdue ? "border-l-red-500" : it.status ? "border-l-[#F26B1D]" : "border-l-[#1e2432]"
    }`}
  >
    <div className="flex items-start gap-2">
      {it.kind === "general" && <Megaphone size={16} className="mt-0.5 shrink-0 text-[#1e2432]" />}
      <p className="flex-1 text-[15px] text-[#1e2432] whitespace-pre-wrap leading-relaxed">{it.content}</p>
      {it.status ? (
        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS[it.status].chip}`}>
          {STATUS[it.status].label}
        </span>
      ) : (
        <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-[#1e2432] border-slate-300">
          งานทุกคน
        </span>
      )}
    </div>
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7A7A7A]">
      <span>โดย {it.createdBy}</span>
      {it.overdue && (
        <span className="flex items-center gap-1 font-semibold text-red-600">
          <AlertTriangle size={12} /> เกินกำหนด
        </span>
      )}
      {it.note && <span>📝 {it.note}</span>}
    </div>
    {it.progress && (
      <div className="mt-2">
        <div className="flex items-center justify-between text-xs mb-1 text-[#1e2432]">
          <span className="flex items-center gap-1">
            <Target size={12} /> {it.progress.current.toLocaleString()} / {it.progress.target.toLocaleString()}{" "}
            {it.progress.unit}
          </span>
          <span className="font-semibold">{it.progress.pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-[#F26B1D] rounded-full" style={{ width: `${Math.min(it.progress.pct, 100)}%` }} />
        </div>
      </div>
    )}
  </div>
);

export default TaskCalendar;