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
import { Megaphone, Plus, Trash2, AlertTriangle, Clock, CalendarClock } from "lucide-react";
import { IEmployee } from "@/types/IEmployee";
import {
  TaskPost,
  TaskAssignment,
  getTaskPosts,
  createTaskPost,
  deleteTaskPost,
  setTaskStatus,
} from "@/services/TaskService";

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "ยังไม่ทำ", className: "bg-amber-50 border-amber-400 text-amber-700" },
  in_progress: { label: "กำลังทำ", className: "bg-blue-50 border-blue-400 text-blue-700" },
  issue: { label: "ติดปัญหา", className: "bg-red-50 border-red-400 text-red-700" },
  done: { label: "ทำแล้ว", className: "bg-emerald-50 border-emerald-400 text-emerald-700" },
};

interface TaskBoardProps {
  employees: IEmployee[];
}

// ✅ กำหนดเวลาต่อคน - เลือกได้ว่าจะกำหนดเป็น "กี่วันจากนี้" หรือ "วันที่เจาะจง"
interface AssignConfig {
  checked: boolean;
  mode: "days" | "date";
  days: string;
  date: string;
}
const defaultConfig: AssignConfig = { checked: false, mode: "days", days: "", date: "" };

const formatDueDate = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

const computeDueDate = (cfg: AssignConfig): string | null => {
  if (cfg.mode === "days") {
    const n = Number(cfg.days);
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

// ✅ ป้ายกำหนดเวลาต่อ badge - แดงถ้าเกินกำหนด, เหลืองถ้าใกล้ถึง (≤1 วัน), เทาถ้ายังไกล
const DueDateTag = ({ a }: { a: TaskAssignment }) => {
  if (!a.due_date) return null;
  if (a.is_overdue) {
    return (
      <span className="text-xs font-bold text-red-600 flex items-center gap-1">
        <AlertTriangle size={12} /> เกินกำหนด {formatDueDate(a.due_date)}
      </span>
    );
  }
  if (a.is_due_soon) {
    return (
      <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
        <Clock size={12} /> ใกล้ครบกำหนด {formatDueDate(a.due_date)}
      </span>
    );
  }
  return (
    <span className="text-xs font-normal opacity-70 flex items-center gap-1">
      <CalendarClock size={12} /> กำหนด {formatDueDate(a.due_date)}
    </span>
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
  const [postType, setPostType] = useState<"general" | "assigned">("general");
  const [assignConfig, setAssignConfig] = useState<Record<number, AssignConfig>>({});
  const [saving, setSaving] = useState(false);

  // ✅ แก้สถานะ+หมายเหตุแบบ inline ต่อ assignment
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftStatus, setDraftStatus] = useState<"pending" | "in_progress" | "issue" | "done">("pending");
  const [draftNote, setDraftNote] = useState("");

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
    setAssignConfig({});
  };

  const getConfig = (id: number): AssignConfig => assignConfig[id] || defaultConfig;
  const updateConfig = (id: number, patch: Partial<AssignConfig>) => {
    setAssignConfig((prev) => ({ ...prev, [id]: { ...getConfig(id), ...patch } }));
  };

  const handleCreate = async () => {
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
      assignments:
        postType === "assigned"
          ? selectedIds.map((id) => ({ employee_id: id, due_date: computeDueDate(getConfig(id)) }))
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
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="พิมพ์ข้อความประกาศหรืองานที่จะมอบหมาย..."
                  rows={4}
                  className="w-full text-sm border rounded-lg px-3 py-2 border-gray-300 outline-none focus:border-orange-400 resize-none"
                />

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
                </div>

                {postType === "assigned" && (
                  <div className="border rounded-xl p-2 space-y-2 max-h-96 overflow-y-auto bg-gray-50">
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
                            <div className="px-3 pb-3 pt-1 border-t border-orange-100 bg-orange-50/40">
                              <div className="flex items-center gap-2 mb-2">
                                <CalendarClock size={13} className="text-orange-500 shrink-0" />
                                <span className="text-xs font-medium text-gray-600">กำหนดเวลา</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex text-xs rounded-lg overflow-hidden border border-gray-300 shadow-sm shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => updateConfig(emp.id!, { mode: "days" })}
                                    className={`px-3 py-1.5 font-medium transition-colors ${
                                      cfg.mode === "days"
                                        ? "bg-gray-900 text-white"
                                        : "bg-white text-gray-500 hover:bg-gray-50"
                                    }`}
                                  >
                                    กี่วัน
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateConfig(emp.id!, { mode: "date" })}
                                    className={`px-3 py-1.5 font-medium transition-colors ${
                                      cfg.mode === "date"
                                        ? "bg-gray-900 text-white"
                                        : "bg-white text-gray-500 hover:bg-gray-50"
                                    }`}
                                  >
                                    วันที่
                                  </button>
                                </div>

                                {cfg.mode === "days" ? (
                                  <input
                                    type="number"
                                    min={1}
                                    value={cfg.days}
                                    onChange={(e) => updateConfig(emp.id!, { days: e.target.value })}
                                    placeholder="เช่น 3 (วัน)"
                                    className="w-28 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 shadow-sm"
                                  />
                                ) : (
                                  <input
                                    type="date"
                                    value={cfg.date}
                                    onChange={(e) => updateConfig(emp.id!, { date: e.target.value })}
                                    className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:border-orange-400 shadow-sm"
                                  />
                                )}
                              </div>
                              <span className="text-[11px] text-gray-400 mt-1.5 block">ไม่กรอก = ไม่มีกำหนดเวลา</span>
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
                  {saving ? "กำลังโพสต์..." : "โพสต์"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีประกาศ</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    โดย {post.created_by} • {formatDate(post.created_at)}
                  </p>
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

                    if (!canToggle) {
                      return (
                        <span
                          key={a.id}
                          className={`text-sm font-medium px-3.5 py-2 rounded-lg border-2 flex flex-col items-start gap-0.5 ${meta.className} ${ring} opacity-80`}
                        >
                          <span>{a.employee_name}: {meta.label}</span>
                          <DueDateTag a={a} />
                          {a.note && <span className="text-xs font-normal">— {a.note}</span>}
                        </span>
                      );
                    }

                    if (editingId === a.id) {
                      return (
                        <div key={a.id} className={`rounded-lg border-2 p-2.5 space-y-1.5 w-full sm:w-72 ${meta.className}`}>
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
                          <DueDateTag a={a} />
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
                      <button
                        key={a.id}
                        onClick={() => startEdit(a)}
                        className={`text-sm font-medium px-3.5 py-2 rounded-lg border-2 flex flex-col items-start gap-0.5 hover:shadow-md transition-all ${meta.className} ${ring}`}
                      >
                        <span className="flex items-center gap-1">
                          {a.is_overdue && <AlertTriangle size={13} className="text-red-600" />}
                          {a.employee_name}: {meta.label}
                        </span>
                        <DueDateTag a={a} />
                        {a.note && <span className="text-xs font-normal opacity-80">📝 {a.note}</span>}
                      </button>
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