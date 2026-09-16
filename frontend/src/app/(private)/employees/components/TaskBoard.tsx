"use client";
// TaskBoard.tsx
// วางไฟล์นี้ใน: frontend/src/app/(private)/employees/components/TaskBoard.tsx
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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
import { Megaphone, Plus, Trash2, Check } from "lucide-react";
import { IEmployee } from "@/types/IEmployee";
import {
  TaskPost,
  getTaskPosts,
  createTaskPost,
  deleteTaskPost,
  toggleTaskStatus,
} from "@/services/TaskService";

interface TaskBoardProps {
  employees: IEmployee[];
}

const TaskBoard = ({ employees }: TaskBoardProps) => {
  const { data: session } = useSession();
  const userInfo = session?.user as any;
  const isAdmin = userInfo?.role === "adm";
  const myUsername = userInfo?.username as string | undefined;

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

  const handleToggle = async (postId: number, employeeIdForAdmin?: number) => {
    const result = await toggleTaskStatus(postId, employeeIdForAdmin);
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
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    โดย {post.created_by} • {formatDate(post.created_at)}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-gray-300 hover:text-rose-500 shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {post.post_type === "assigned" && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {post.assignments.map((a) => {
                    const isMine = a.employee_username === myUsername;
                    const canToggle = isAdmin || isMine;
                    return (
                      <button
                        key={a.id}
                        disabled={!canToggle}
                        onClick={() => canToggle && handleToggle(post.id, isAdmin ? a.employee_id : undefined)}
                        className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${
                          a.status === "done"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "bg-amber-50 border-amber-300 text-amber-700"
                        } ${canToggle ? "cursor-pointer hover:opacity-80" : "cursor-default opacity-70"}`}
                      >
                        {a.status === "done" && <Check size={12} />}
                        {a.employee_name}: {a.status === "done" ? "ทำแล้ว" : "ยังไม่ทำ"}
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