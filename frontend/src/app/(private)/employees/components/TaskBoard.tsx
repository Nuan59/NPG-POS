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
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { IEmployee } from "@/types/IEmployee";
import {
  TaskPost,
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
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

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
    setSelectedEmployees([]);
  };

  const handleCreate = async () => {
    if (!content.trim()) {
      toast.error("กรุณากรอกเนื้อหา");
      return;
    }
    if (postType === "assigned" && selectedEmployees.length === 0) {
      toast.error("กรุณาเลือกพนักงานที่จะมอบหมาย");
      return;
    }
    setSaving(true);
    const result = await createTaskPost({
      content: content.trim(),
      post_type: postType,
      employee_ids: postType === "assigned" ? selectedEmployees : undefined,
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

  const handleSetStatus = async (
    postId: number,
    newStatus: "pending" | "in_progress" | "issue" | "done",
    employeeIdForAdmin?: number
  ) => {
    const result = await setTaskStatus(postId, newStatus, employeeIdForAdmin);
    if (result.status === "success") {
      loadPosts();
    } else {
      toast.error(result.error || "อัปเดตไม่สำเร็จ");
    }
  };

  const toggleEmployeeSelect = (id: number) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
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

        {isAdmin && (
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
            <DialogContent>
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
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {employees
                      .filter((e) => e.role !== "adm")
                      .map((emp) => (
                        <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={selectedEmployees.includes(emp.id!)}
                            onCheckedChange={() => toggleEmployeeSelect(emp.id!)}
                          />
                          {emp.name}
                        </label>
                      ))}
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
                {isAdmin && (
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

                    if (!canToggle) {
                      return (
                        <span
                          key={a.id}
                          className={`text-sm font-medium px-3.5 py-2 rounded-lg border-2 ${meta.className} opacity-80`}
                        >
                          {a.employee_name}: {meta.label}
                        </span>
                      );
                    }

                    return (
                      <div
                        key={a.id}
                        className={`flex items-center gap-1.5 text-sm font-medium pl-3.5 pr-1.5 py-1.5 rounded-lg border-2 ${meta.className}`}
                      >
                        <span>{a.employee_name}:</span>
                        <select
                          value={a.status}
                          onChange={(e) =>
                            handleSetStatus(
                              post.id,
                              e.target.value as "pending" | "in_progress" | "issue" | "done",
                              isAdmin ? a.employee_id : undefined
                            )
                          }
                          className="bg-transparent font-semibold outline-none cursor-pointer pr-1"
                        >
                          {Object.entries(STATUS_META).map(([value, m]) => (
                            <option key={value} value={value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
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