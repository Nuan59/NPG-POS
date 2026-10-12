"use client";
// TaskBoard.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/employees/components/TaskBoard.tsx
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, AlertTriangle, Clock, CalendarClock, Target, History, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, UserCheck } from "lucide-react";
import { IEmployee } from "@/types/IEmployee";
import {
  TaskPost,
  TaskAssignment,
  getTaskPosts,
  createTaskPost,
  deleteTaskPost,
  setTaskStatus,
  addTaskProgress,
} from "@/services/TaskService";

// ✅ เวร = โพสต์มอบหมายงานที่ขึ้นต้นด้วย "[เวร] " (ใช้ระบบงานเดิม ไม่ต้องมีตารางใหม่)
// 1 วัน = 1 โพสต์ (ระบบเดิมให้ 1 คนอยู่ในโพสต์เดียวได้ครั้งเดียว) / ทุกคนเห็นเวรของทุกคนในปฏิทิน
export const DUTY_PREFIX = "[เวร] ";
export const isDutyPost = (p: { content: string }) => (p.content || "").startsWith(DUTY_PREFIX.trim());
const DUTY_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "ยังไม่ทำ", className: "bg-amber-50 border-amber-400 text-amber-700" },
  in_progress: { label: "กำลังทำ", className: "bg-blue-50 border-blue-400 text-blue-700" },
  issue: { label: "ติดปัญหา", className: "bg-red-50 border-red-400 text-red-700" },
  done: { label: "ทำแล้ว", className: "bg-emerald-50 border-emerald-400 text-emerald-700" },
};

interface TaskBoardProps {
  employees: IEmployee[];
}

// ✅ ตั้งกำหนดเวลาได้ 2 แบบ - "ระยะเวลา" (กี่วันนับจากนี้) หรือ "วันที่" (เจาะจงวันที่)
// บวกเป้าหมายความคืบหน้า (ไม่บังคับ) - แล้วแต่งานที่มอบหมาย
interface AssignConfig {
  checked: boolean;
  mode: "duration" | "date";
  duration: string;
  date: string;
  targetQuantity: string;
  targetUnit: string;
}
const defaultAssignConfig: AssignConfig = {
  checked: false,
  mode: "duration",
  duration: "",
  date: "",
  targetQuantity: "",
  targetUnit: "",
};

interface DueConfig {
  checked: boolean;
  mode: "duration" | "date";
  duration: string;
  date: string;
}
const defaultDueConfig: DueConfig = { checked: false, mode: "duration", duration: "", date: "" };

const formatDueDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

const formatLogDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const computeDueDate = (cfg: { mode: "duration" | "date"; duration: string; date: string }): string | null => {
  if (cfg.mode === "duration") {
    const n = Number(cfg.duration);
    if (!n || n <= 0) return null;
    const d = new Date();
    d.setDate(d.getDate() + n);
    d.setHours(23, 59, 0, 0);
    return d.toISOString();
  }
  if (!cfg.date) return null;
  const d = new Date(`${cfg.date}T23:59:00`);
  return d.toISOString();
};

interface DueLike {
  due_date: string | null;
  is_overdue: boolean;
  is_due_soon: boolean;
}

// ✅ ป้ายกำหนดเวลา - แดงถ้าเกินกำหนด, เหลืองถ้าใกล้ถึง (≤1 วัน), เทาถ้ายังไกล
const DueDateTag = ({ d }: { d: DueLike }) => {
  if (!d.due_date) return null;
  if (d.is_overdue) {
    return (
      <span className="text-xs font-bold text-red-600 flex items-center gap-1">
        <AlertTriangle size={12} /> เกินกำหนด {formatDueDate(d.due_date)}
      </span>
    );
  }
  if (d.is_due_soon) {
    return (
      <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
        <Clock size={12} /> ใกล้ครบกำหนด {formatDueDate(d.due_date)}
      </span>
    );
  }
  return (
    <span className="text-xs font-normal opacity-70 flex items-center gap-1">
      <CalendarClock size={12} /> กำหนด {formatDueDate(d.due_date)}
    </span>
  );
};

// ✅ ตัวเลือก "ระยะเวลา" / "วันที่" ใช้ซ้ำได้ทั้งประกาศทั่วไป (ตัวเดียว) และมอบหมายงาน (ต่อคน)
const DueConfigPicker = ({
  cfg,
  onChange,
}: {
  cfg: { mode: "duration" | "date"; duration: string; date: string };
  onChange: (patch: Partial<{ mode: "duration" | "date"; duration: string; date: string }>) => void;
}) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <CalendarClock size={13} className="text-orange-500 shrink-0" />
      <span className="text-xs font-medium text-gray-600">กำหนดเวลา</span>
    </div>
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex text-xs rounded-lg overflow-hidden border border-gray-300 shadow-sm shrink-0">
        <button
          type="button"
          onClick={() => onChange({ mode: "duration" })}
          className={`px-3 py-1.5 font-medium transition-colors ${
            cfg.mode === "duration" ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          ระยะเวลา
        </button>
        <button
          type="button"
          onClick={() => onChange({ mode: "date" })}
          className={`px-3 py-1.5 font-medium transition-colors ${
            cfg.mode === "date" ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          วันที่
        </button>
      </div>

      {cfg.mode === "duration" ? (
        <input
          type="number"
          min={1}
          value={cfg.duration}
          onChange={(e) => onChange({ duration: e.target.value })}
          placeholder="เช่น 3 (วัน)"
          className="w-28 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 shadow-sm"
        />
      ) : (
        <input
          type="date"
          value={cfg.date}
          onChange={(e) => onChange({ date: e.target.value })}
          className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 shadow-sm"
        />
      )}
    </div>
    <span className="text-[11px] text-gray-400 mt-1.5 block">ไม่กรอก = ไม่มีกำหนดเวลา</span>
  </div>
);

// ✅ แถบความคืบหน้า - โชว์เฉพาะงานที่ตั้งเป้าหมายจำนวนไว้
const ProgressBar = ({ a }: { a: TaskAssignment }) => {
  if (!a.target_quantity) return null;
  const pct = a.progress_percentage ?? 0;
  return (
    <div className="mt-1.5 w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="flex items-center gap-1 font-medium opacity-80">
          <Target size={12} /> {a.current_progress.toLocaleString()} / {a.target_quantity.toLocaleString()}
          {a.target_unit ? ` ${a.target_unit}` : ""}
        </span>
        <span className="font-semibold opacity-70">{pct}%</span>
      </div>
      <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-current rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
};

const TaskBoard = ({ employees }: TaskBoardProps) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const userInfo = session?.user as any;
  const isAdmin = userInfo?.role === "adm";
  const myUsername = userInfo?.username as string | undefined;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const [posts, setPosts] = useState<TaskPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"general" | "assigned" | "duty">("general");
  // ✅ ลงเวร: ชื่อเวร + คน + เลือกได้หลายวัน (สร้าง 1 โพสต์ต่อวัน)
  const [dutyName, setDutyName] = useState("");
  const [dutyPeople, setDutyPeople] = useState<number[]>([]);
  const [dutyDates, setDutyDates] = useState<string[]>([]);
  const [dutyMonth, setDutyMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  // ✅ กำหนดเวลาของ "ประกาศทั่วไป" - ตัวเดียวใช้ร่วมกันทุกคน
  const [generalDueConfig, setGeneralDueConfig] = useState<DueConfig>(defaultDueConfig);
  // ✅ กำหนดเวลา+เป้าหมายของ "มอบหมายงาน" - แยกได้คนละคน (key = employee id)
  const [assignConfig, setAssignConfig] = useState<Record<number, AssignConfig>>({});
  const [saving, setSaving] = useState(false);

  // ✅ แก้สถานะ+หมายเหตุแบบ inline ต่อ assignment
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftStatus, setDraftStatus] = useState<"pending" | "in_progress" | "issue" | "done">("pending");
  const [draftNote, setDraftNote] = useState("");

  // ✅ อัปเดตความคืบหน้ารายวัน แบบ inline ต่อ assignment
  const [progressEditingId, setProgressEditingId] = useState<number | null>(null);
  const [progressAmount, setProgressAmount] = useState("");
  const [progressNote, setProgressNote] = useState("");
  const [progressSaving, setProgressSaving] = useState(false);
  // ✅ เปิด/ปิดดูประวัติการอัปเดตย้อนหลัง ต่อ assignment
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

  const loadPosts = async () => {
    const data = await getTaskPosts();
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setContent("");
    setPostType("general");
    setGeneralDueConfig(defaultDueConfig);
    setAssignConfig({});
    setDutyName("");
    setDutyPeople([]);
    setDutyDates([]);
  };

  const createDuty = async () => {
    const name = dutyName.trim();
    if (!name) return toast.error("กรุณาใส่ชื่อเวร เช่น เปิดร้าน");
    if (dutyPeople.length === 0) return toast.error("กรุณาเลือกคนเข้าเวร");
    if (dutyDates.length === 0) return toast.error("กรุณาเลือกวันอย่างน้อย 1 วัน");
    setSaving(true);
    let failed = 0;
    for (const day of [...dutyDates].sort()) {
      const result = await createTaskPost({
        content: `${DUTY_PREFIX}${name}`,
        post_type: "assigned",
        assignments: dutyPeople.map((id) => ({
          employee_id: id,
          due_date: new Date(`${day}T23:59:00`).toISOString(),
          target_quantity: null,
          target_unit: "",
        })),
      });
      if (result.status !== "success") failed += 1;
    }
    setSaving(false);
    if (failed) toast.error(`ลงเวรไม่สำเร็จ ${failed} วัน ลองใหม่อีกครั้ง`);
    else toast.success(`ลงเวร${name} ${dutyDates.length} วันแล้ว`);
    setDialogOpen(false);
    resetForm();
    loadPosts();
  };

  const getConfig = (id: number): AssignConfig => assignConfig[id] || defaultAssignConfig;
  const updateConfig = (id: number, patch: Partial<AssignConfig>) => {
    setAssignConfig((prev) => ({ ...prev, [id]: { ...getConfig(id), ...patch } }));
  };

  const handleCreate = async () => {
    if (postType === "duty") return createDuty();
    if (!content.trim()) {
      toast.error("กรุณากรอกเนื้อหา");
      return;
    }
    const selectedIds = Object.entries(assignConfig)
      .filter(([, cfg]) => cfg.checked)
      .map(([id]) => Number(id));

    if (postType === "assigned" && selectedIds.length === 0) {
      toast.error("กรุณาเลือกคนที่จะมอบหมาย");
      return;
    }

    setSaving(true);
    const result = await createTaskPost({
      content: content.trim(),
      post_type: postType,
      due_date: postType === "general" ? computeDueDate(generalDueConfig) : undefined,
      assignments:
        postType === "assigned"
          ? selectedIds.map((id) => {
              const cfg = getConfig(id);
              const qty = Number(cfg.targetQuantity);
              return {
                employee_id: id,
                due_date: computeDueDate(cfg),
                target_quantity: qty > 0 ? qty : null,
                target_unit: cfg.targetUnit.trim(),
              };
            })
          : undefined,
    });
    setSaving(false);
    if (result.status === "success") {
      toast.success("โพสต์เรียบร้อยแล้ว");
      setDialogOpen(false);
      resetForm();
      loadPosts();
    } else {
      toast.error(result.error || "เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("ต้องการลบโพสต์นี้ใช่ไหม?")) return;
    const result = await deleteTaskPost(id);
    if (result.status === "success") {
      toast.success("ลบแล้ว");
      loadPosts();
    } else {
      toast.error(result.error || "ลบไม่สำเร็จ");
    }
  };

  const startEdit = (a: TaskAssignment) => {
    setEditingId(a.id);
    setDraftStatus(a.status);
    setDraftNote(a.note || "");
  };

  const saveEdit = async (postId: number, employeeIdForAdmin?: number) => {
    const result = await setTaskStatus(postId, draftStatus, draftNote, employeeIdForAdmin);
    if (result.status === "success") {
      setEditingId(null);
      loadPosts();
    } else {
      toast.error(result.error || "อัปเดตไม่สำเร็จ");
    }
  };

  const startProgressEdit = (a: TaskAssignment) => {
    setProgressEditingId(a.id);
    setProgressAmount("");
    setProgressNote("");
  };

  const saveProgress = async (postId: number, employeeIdForAdmin?: number) => {
    const amount = Number(progressAmount);
    if (!amount || amount <= 0) {
      toast.error("กรุณากรอกจำนวนที่มากกว่า 0");
      return;
    }
    setProgressSaving(true);
    const result = await addTaskProgress(postId, amount, progressNote, employeeIdForAdmin);
    setProgressSaving(false);
    if (result.status === "success") {
      toast.success(`บันทึกความคืบหน้า +${amount} แล้ว`);
      setProgressEditingId(null);
      loadPosts();
    } else {
      toast.error(result.error || "อัปเดตไม่สำเร็จ");
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("th-TH", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) return null;

  return (
    <div className="mt-4 p-4 border rounded-xl bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Megaphone size={16} className="text-orange-500" />
          <h3 className="font-semibold text-slate-800 text-sm">ประกาศ / มอบหมายงาน</h3>
        </div>

        {status === "authenticated" && (
          <Dialog
            open={dialogOpen}
            onOpenChange={(o) => {
              setDialogOpen(o);
              if (!o) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus size={14} /> โพสต์ใหม่
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>ประกาศ / มอบหมายงานใหม่</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                {postType !== "duty" && (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="พิมพ์ข้อความประกาศหรืองานที่จะมอบหมาย..."
                  rows={4}
                  className="w-full text-sm border rounded-lg px-3 py-2 border-gray-300 outline-none focus:border-orange-400 resize-none"
                />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPostType("general")}
                    className={`flex-1 text-sm font-medium rounded-lg border py-2 transition-colors ${
                      postType === "general"
                        ? "bg-orange-50 border-orange-400 text-orange-700"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    📢 ประกาศทั่วไป
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType("assigned")}
                    className={`flex-1 text-sm font-medium rounded-lg border py-2 transition-colors ${
                      postType === "assigned"
                        ? "bg-orange-50 border-orange-400 text-orange-700"
                        : "border-gray-200 text-gray-500"
                    }`}
                  >
                    ✅ มอบหมายเฉพาะคน
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setPostType("duty")}
                      className={`flex-1 text-sm font-medium rounded-lg border py-2 transition-colors ${
                        postType === "duty"
                          ? "bg-orange-50 border-orange-400 text-orange-700"
                          : "border-gray-200 text-gray-500"
                      }`}
                    >
                      📅 เวร
                    </button>
                  )}
                </div>

                {/* ✅ ลงเวร - ทุกคนเห็นในปฏิทิน */}
                {postType === "duty" && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1.5">ชื่อเวร</p>
                      <input
                        value={dutyName}
                        onChange={(e) => setDutyName(e.target.value)}
                        placeholder="เช่น เปิดร้าน, ปิดร้าน, ทำความสะอาด"
                        className="w-full text-sm border rounded-lg px-3 py-2 border-gray-300 outline-none focus:border-orange-400"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {["เปิดร้าน", "ปิดร้าน", "ทำความสะอาด"].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setDutyName(n)}
                            className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-orange-400"
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1.5">คนเข้าเวร</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {employees.map((emp) => {
                          const on = dutyPeople.includes(emp.id!);
                          return (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() =>
                                setDutyPeople((p) => (on ? p.filter((x) => x !== emp.id) : [...p, emp.id!]))
                              }
                              className={`text-sm text-left rounded-lg border px-3 py-2 truncate ${
                                on ? "bg-orange-50 border-orange-400 text-orange-700 font-medium" : "border-gray-200 text-gray-700"
                              }`}
                            >
                              {on ? "✓ " : ""}
                              {emp.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-medium text-gray-600">
                          เลือกวัน {dutyDates.length > 0 && <span className="text-orange-600">({dutyDates.length} วัน)</span>}
                        </p>
                        {dutyDates.length > 0 && (
                          <button type="button" onClick={() => setDutyDates([])} className="text-xs text-gray-500 underline">
                            ล้าง
                          </button>
                        )}
                      </div>
                      <div className="border rounded-xl p-2">
                        <div className="flex items-center justify-between mb-1">
                          <button
                            type="button"
                            aria-label="เดือนก่อน"
                            onClick={() => setDutyMonth(new Date(dutyMonth.getFullYear(), dutyMonth.getMonth() - 1, 1))}
                            className="p-1.5 rounded-lg hover:bg-gray-100"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          <span className="text-sm font-semibold">
                            {THAI_MONTHS[dutyMonth.getMonth()]} {dutyMonth.getFullYear() + 543}
                          </span>
                          <button
                            type="button"
                            aria-label="เดือนถัดไป"
                            onClick={() => setDutyMonth(new Date(dutyMonth.getFullYear(), dutyMonth.getMonth() + 1, 1))}
                            className="p-1.5 rounded-lg hover:bg-gray-100"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                        {(() => {
                          const y = dutyMonth.getFullYear();
                          const m = dutyMonth.getMonth();
                          const first = new Date(y, m, 1).getDay();
                          const daysInMonth = new Date(y, m + 1, 0).getDate();
                          const todayStr = ymd(new Date());
                          const monthDays = Array.from({ length: daysInMonth }, (_, i) => new Date(y, m, i + 1));
                          // กดชื่อวัน = เลือก/ยกเลิก วันนั้นทั้งเดือน (ไม่รวมวันที่ผ่านไปแล้ว)
                          const toggleWeekday = (wd: number) => {
                            const target = monthDays.filter((d) => d.getDay() === wd && ymd(d) >= todayStr).map(ymd);
                            const allOn = target.length > 0 && target.every((k) => dutyDates.includes(k));
                            setDutyDates((prev) =>
                              allOn ? prev.filter((k) => !target.includes(k)) : Array.from(new Set([...prev, ...target]))
                            );
                          };
                          return (
                            <div className="grid grid-cols-7 gap-1 text-center">
                              {DUTY_WEEKDAYS.map((w, i) => (
                                <button
                                  key={w}
                                  type="button"
                                  onClick={() => toggleWeekday(i)}
                                  title={`เลือกทุกวัน${w}ของเดือนนี้`}
                                  className={`text-[11px] font-semibold py-1 rounded hover:bg-orange-50 ${i === 0 ? "text-red-500" : "text-gray-500"}`}
                                >
                                  {w}
                                </button>
                              ))}
                              {Array.from({ length: first }, (_, i) => (
                                <span key={`b${i}`} />
                              ))}
                              {monthDays.map((d) => {
                                const k = ymd(d);
                                const on = dutyDates.includes(k);
                                const past = k < todayStr;
                                return (
                                  <button
                                    key={k}
                                    type="button"
                                    disabled={past}
                                    onClick={() =>
                                      setDutyDates((prev) => (on ? prev.filter((x) => x !== k) : [...prev, k]))
                                    }
                                    className={`h-9 rounded-lg text-sm font-medium ${
                                      on
                                        ? "bg-orange-500 text-white"
                                        : past
                                        ? "text-gray-300"
                                        : k === todayStr
                                        ? "border border-orange-400 text-gray-800"
                                        : "text-gray-800 hover:bg-gray-100"
                                    }`}
                                  >
                                    {d.getDate()}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1.5">กดชื่อวัน (จ, อ, ...) = เลือกทุกวันนั้นของเดือน</p>
                    </div>
                  </div>
                )}

                {/* ✅ ประกาศทั่วไป - กำหนดเวลาเดียวใช้ร่วมกันทุกคน */}
                {postType === "general" && (
                  <div className="border rounded-xl p-3 bg-orange-50/40 border-orange-100">
                    <DueConfigPicker
                      cfg={generalDueConfig}
                      onChange={(patch) => setGeneralDueConfig((prev) => ({ ...prev, ...patch }))}
                    />
                  </div>
                )}

                {/* ✅ มอบหมายงาน - เลือกคน + กำหนดเวลา + เป้าหมายความคืบหน้า แยกรายคน */}
                {postType === "assigned" && (
                  <div className="border rounded-xl p-2 space-y-2 max-h-[28rem] overflow-y-auto bg-gray-50">
                    {employees.map((emp) => {
                      const cfg = getConfig(emp.id!);
                      return (
                        <div
                          key={emp.id}
                          className={`rounded-lg border transition-all overflow-hidden ${
                            cfg.checked ? "bg-white border-orange-300 shadow-sm" : "bg-white/60 border-transparent"
                          }`}
                        >
                          <label className="flex items-center gap-2.5 text-sm cursor-pointer px-3 py-2.5">
                            <Checkbox
                              checked={cfg.checked}
                              onCheckedChange={(v) => updateConfig(emp.id!, { checked: !!v })}
                            />
                            <span className="font-medium">{emp.name}</span>
                            {emp.role === "adm" && (
                              <span className="text-[10px] text-orange-500 font-semibold bg-orange-50 px-1.5 py-0.5 rounded">
                                ผู้ดูแลระบบ
                              </span>
                            )}
                          </label>

                          {cfg.checked && (
                            <div className="px-3 pb-3 pt-1 border-t border-orange-100 bg-orange-50/40 space-y-3">
                              <DueConfigPicker cfg={cfg} onChange={(patch) => updateConfig(emp.id!, patch)} />

                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Target size={13} className="text-orange-500 shrink-0" />
                                  <span className="text-xs font-medium text-gray-600">
                                    เป้าหมายความคืบหน้า (ไม่บังคับ)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <input
                                    type="number"
                                    min={1}
                                    value={cfg.targetQuantity}
                                    onChange={(e) => updateConfig(emp.id!, { targetQuantity: e.target.value })}
                                    placeholder="จำนวน เช่น 200"
                                    className="w-28 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 shadow-sm"
                                  />
                                  <input
                                    type="text"
                                    value={cfg.targetUnit}
                                    onChange={(e) => updateConfig(emp.id!, { targetUnit: e.target.value })}
                                    placeholder="หน่วย เช่น คัน"
                                    className="w-28 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 shadow-sm"
                                  />
                                </div>
                                <span className="text-[11px] text-gray-400 mt-1.5 block">
                                  ใส่แล้วคนทำงานจะอัปเดตความคืบหน้ารายวันได้ (เช่น ลอกลาย 200 คัน)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  ยกเลิก
                </Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? "กำลังบันทึก..." : postType === "duty" ? `ลงเวร${dutyDates.length ? ` ${dutyDates.length} วัน` : ""}` : "โพสต์"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* ✅ เวรไม่แสดงในบอร์ดนี้ (ดูในปฏิทินแทน) กันบอร์ดรก */}
      {posts.some(isDutyPost) && (
        <p className="mb-3 text-xs text-gray-500 flex items-center gap-1.5">
          <UserCheck size={13} className="text-orange-500" />
          มีเวรที่ลงไว้ {posts.filter(isDutyPost).length} วัน · ดู/ลบเวรได้ในปฏิทินด้านบน
        </p>
      )}
      {posts.filter((p) => !isDutyPost(p)).length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีประกาศ</p>
      ) : (
        <div className="space-y-4">
          {posts.filter((p) => !isDutyPost(p)).map((post) => (
            <div key={post.id} className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <p className="text-xs text-gray-400">
                      โดย {post.created_by} • {formatDate(post.created_at)}
                    </p>
                    {/* ✅ กำหนดเวลาของประกาศทั่วไป */}
                    {post.post_type === "general" && (
                      <DueDateTag d={{ due_date: post.due_date, is_overdue: post.is_overdue, is_due_soon: post.is_due_soon }} />
                    )}
                  </div>
                </div>
                {(isAdmin || post.created_by_username === myUsername) && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-gray-300 hover:text-rose-500 shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              {post.post_type === "assigned" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.assignments.map((a) => {
                    const isMine = a.employee_username === myUsername;
                    const canToggle = isAdmin || isMine;
                    const meta = STATUS_META[a.status] || STATUS_META.pending;
                    const ring = a.is_overdue
                      ? "ring-2 ring-red-500"
                      : a.is_due_soon
                      ? "ring-2 ring-amber-400"
                      : "";
                    const cardWidth = a.target_quantity ? "w-full sm:w-80" : "";

                    if (!canToggle) {
                      return (
                        <div
                          key={a.id}
                          className={`text-sm font-medium px-3.5 py-2 rounded-lg border-2 flex flex-col items-start gap-0.5 ${meta.className} ${ring} ${cardWidth} opacity-80`}
                        >
                          <span>{a.employee_name}: {meta.label}</span>
                          <DueDateTag d={a} />
                          <ProgressBar a={a} />
                          {a.note && <span className="text-xs font-normal">— {a.note}</span>}
                        </div>
                      );
                    }

                    if (editingId === a.id) {
                      return (
                        <div key={a.id} className={`rounded-lg border-2 p-2.5 space-y-1.5 w-full sm:w-80 ${meta.className}`}>
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <span>{a.employee_name}:</span>
                            <select
                              value={draftStatus}
                              onChange={(e) => setDraftStatus(e.target.value as typeof draftStatus)}
                              className="bg-transparent font-semibold outline-none cursor-pointer"
                            >
                              {Object.entries(STATUS_META).map(([value, m]) => (
                                <option key={value} value={value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <DueDateTag d={a} />
                          <input
                            value={draftNote}
                            onChange={(e) => setDraftNote(e.target.value)}
                            placeholder="หมายเหตุ (ถ้ามี)"
                            className="text-xs border rounded px-2 py-1.5 w-full bg-white/70 outline-none"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => saveEdit(post.id, isAdmin ? a.employee_id : undefined)}
                              className="text-xs bg-gray-900 text-white rounded px-2.5 py-1 font-medium"
                            >
                              บันทึก
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs border rounded px-2.5 py-1 bg-white/70"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={a.id}
                        className={`rounded-lg border-2 p-2.5 flex flex-col gap-1 hover:shadow-md transition-all ${meta.className} ${ring} ${cardWidth}`}
                      >
                        <button
                          onClick={() => startEdit(a)}
                          className="text-sm font-medium flex flex-col items-start gap-0.5 text-left"
                        >
                          <span className="flex items-center gap-1">
                            {a.is_overdue && <AlertTriangle size={13} className="text-red-600" />}
                            {a.employee_name}: {meta.label}
                          </span>
                          <DueDateTag d={a} />
                          {a.note && <span className="text-xs font-normal opacity-80">📝 {a.note}</span>}
                        </button>

                        <ProgressBar a={a} />

                        {/* ✅ อัปเดตความคืบหน้ารายวัน - เฉพาะงานที่ตั้งเป้าหมายจำนวนไว้ */}
                        {a.target_quantity && (
                          <div className="mt-1">
                            {progressEditingId === a.id ? (
                              <div className="space-y-1.5 bg-white/70 rounded p-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium shrink-0">วันนี้ทำได้ +</span>
                                  <input
                                    type="number"
                                    min={1}
                                    value={progressAmount}
                                    onChange={(e) => setProgressAmount(e.target.value)}
                                    placeholder="จำนวน"
                                    className="w-20 text-xs border rounded px-2 py-1 outline-none"
                                    autoFocus
                                  />
                                  <span className="text-xs shrink-0">{a.target_unit}</span>
                                </div>
                                <input
                                  value={progressNote}
                                  onChange={(e) => setProgressNote(e.target.value)}
                                  placeholder="หมายเหตุ (ถ้ามี)"
                                  className="text-xs border rounded px-2 py-1.5 w-full outline-none"
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => saveProgress(post.id, isAdmin ? a.employee_id : undefined)}
                                    disabled={progressSaving}
                                    className="text-xs bg-gray-900 text-white rounded px-2.5 py-1 font-medium"
                                  >
                                    {progressSaving ? "กำลังบันทึก..." : "บันทึก"}
                                  </button>
                                  <button
                                    onClick={() => setProgressEditingId(null)}
                                    className="text-xs border rounded px-2.5 py-1 bg-white"
                                  >
                                    ยกเลิก
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => startProgressEdit(a)}
                                  className="text-xs bg-gray-900 text-white rounded-full px-3 py-1 font-medium flex items-center gap-1"
                                >
                                  <Plus size={11} /> อัปเดตวันนี้
                                </button>
                                {a.progress_logs.length > 0 && (
                                  <button
                                    onClick={() => setExpandedHistoryId(expandedHistoryId === a.id ? null : a.id)}
                                    className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100"
                                  >
                                    <History size={11} />
                                    ประวัติ
                                    {expandedHistoryId === a.id ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                  </button>
                                )}
                              </div>
                            )}

                            {expandedHistoryId === a.id && a.progress_logs.length > 0 && (
                              <div className="mt-1.5 space-y-1 max-h-28 overflow-y-auto bg-white/60 rounded p-1.5">
                                {a.progress_logs.map((log) => (
                                  <div key={log.id} className="text-[11px] flex justify-between gap-2">
                                    <span className="opacity-70 shrink-0">{formatLogDate(log.created_at)}</span>
                                    <span className="font-medium">+{log.amount}</span>
                                    {log.note && <span className="opacity-60 truncate">{log.note}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskBoard;